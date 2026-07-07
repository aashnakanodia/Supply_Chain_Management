'use strict';

const { GoogleGenAI } = require('@google/genai');
const inventoryService      = require('./inventory.service');
const purchaseOrderService  = require('./purchaseOrders.service');
const shipmentsService      = require('./shipments.service');
const alertsService         = require('./alerts.service');
const dashboardService      = require('./dashboard.service');
const suppliersService      = require('./suppliers.service');
const warehousesService     = require('./warehouses.service');
const productsService       = require('./products.service');
const usersService          = require('./users.service');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  // READ
  {
    name: 'get_daily_briefing',
    description: 'Get a combined briefing of everything that needs attention: critical alerts, POs awaiting approval, low-stock items, and in-transit shipments. Use this when the user asks "what needs my attention" or "what should I do today".',
    parameters: { type: 'object', properties: {} },
    requiredPermission: 'dashboard:read',
  },
  {
    name: 'get_dashboard_summary',
    description: 'Get live KPI numbers: total active SKUs, low-stock count, pending PO count and value, open alert count, shipments in transit.',
    parameters: { type: 'object', properties: {} },
    requiredPermission: 'dashboard:read',
  },
  {
    name: 'list_inventory',
    description: 'List inventory items with current stock levels. Can filter to show only items below reorder point.',
    parameters: {
      type: 'object',
      properties: {
        lowStock: { type: 'boolean', description: 'If true, return only items at or below their reorder point' },
        limit:    { type: 'number',  description: 'Max rows to return, default 12' },
      },
    },
    requiredPermission: 'inventory:read',
  },
  {
    name: 'list_purchase_orders',
    description: 'List purchase orders. Filter by status to see pending, approved, ordered, shipped, received, or cancelled POs.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'One of: pending, approved, ordered, shipped, received, cancelled' },
        limit:  { type: 'number', description: 'Max rows to return, default 10' },
      },
    },
    requiredPermission: 'purchase_orders:read',
  },
  {
    name: 'get_purchase_order',
    description: 'Get full details of a single purchase order including all line items, supplier, and warehouse.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Purchase order UUID' },
      },
      required: ['id'],
    },
    requiredPermission: 'purchase_orders:read',
  },
  {
    name: 'list_shipments',
    description: 'List shipments. Filter by status: pending, in_transit, delivered, or cancelled.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'One of: pending, in_transit, delivered, cancelled' },
        limit:  { type: 'number', description: 'Max rows to return, default 10' },
      },
    },
    requiredPermission: 'shipments:read',
  },
  {
    name: 'get_shipment',
    description: 'Get full details of a single shipment by its shipment number (e.g. SHP-2026-0001). Use this when the user asks about a specific shipment.',
    parameters: {
      type: 'object',
      properties: {
        shipmentNumber: { type: 'string', description: 'Shipment number, e.g. SHP-2026-0001' },
      },
      required: ['shipmentNumber'],
    },
    requiredPermission: 'shipments:read',
  },
  {
    name: 'list_alerts',
    description: 'List supply chain alerts. Defaults to active (unresolved) alerts. Can filter by severity.',
    parameters: {
      type: 'object',
      properties: {
        severity:   { type: 'string',  description: 'One of: low, medium, high, critical' },
        isResolved: { type: 'boolean', description: 'true = show resolved, false = show active (default false)' },
        limit:      { type: 'number',  description: 'Max rows to return, default 10' },
      },
    },
    requiredPermission: 'alerts:read',
  },
  {
    name: 'list_suppliers',
    description: 'List all active suppliers with their IDs and names. Required before creating a purchase order so you can resolve a supplier name to its ID.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional name search filter' },
      },
    },
    requiredPermission: 'suppliers:read',
  },
  {
    name: 'list_products',
    description: 'List all active products/SKUs with their IDs, names, and unit prices. Required before creating a purchase order so you can resolve a product name to its ID.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Optional name or SKU search filter' },
        limit:  { type: 'number', description: 'Max rows to return, default 30' },
      },
    },
    requiredPermission: 'products:read',
  },
  {
    name: 'list_warehouses',
    description: 'List all active warehouses with their IDs and names. Required before creating a purchase order or shipment so you can resolve a warehouse name to its ID.',
    parameters: { type: 'object', properties: {} },
    requiredPermission: 'warehouses:read',
  },
  // CREATE
  {
    name: 'create_product',
    description: 'Create a new product / SKU in the catalogue. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        sku:           { type: 'string', description: 'Unique SKU code, e.g. PROD-001' },
        name:          { type: 'string', description: 'Product display name' },
        description:   { type: 'string', description: 'Optional product description' },
        category:      { type: 'string', description: 'Product category, e.g. Electronics, Packaging' },
        unit:          { type: 'string', description: 'Unit of measure, e.g. piece, kg, litre (default: piece)' },
        unitPrice:     { type: 'number', description: 'Unit price in INR' },
        reorderLevel:  { type: 'number', description: 'Stock level that triggers a low-stock alert (default 0)' },
        leadTimeDays:  { type: 'number', description: 'Supplier lead time in days (default 0)' },
      },
      required: ['sku', 'name'],
    },
    requiredPermission: 'products:write',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  {
    name: 'create_inventory_item',
    description: 'Add a product to a warehouse\'s inventory with an opening stock quantity. Call list_products and list_warehouses first to resolve names to IDs. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        warehouseId:  { type: 'string', description: 'Warehouse UUID' },
        productId:    { type: 'string', description: 'Product UUID' },
        quantity:     { type: 'number', description: 'Opening stock quantity' },
        reorderPoint: { type: 'number', description: 'Quantity at which a low-stock alert fires (default 0)' },
      },
      required: ['warehouseId', 'productId', 'quantity'],
    },
    requiredPermission: 'inventory:write',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  {
    name: 'create_purchase_order',
    description: 'Create a new draft purchase order. Always call list_suppliers, list_products, and list_warehouses first to resolve names to IDs. Confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        supplierId:   { type: 'string', description: 'Supplier UUID' },
        warehouseId:  { type: 'string', description: 'Destination warehouse UUID' },
        expectedDate: { type: 'string', description: 'Expected delivery date in YYYY-MM-DD format (optional)' },
        notes:        { type: 'string', description: 'Optional notes for the PO' },
        items: {
          type: 'array',
          description: 'Line items for the order',
          items: {
            type: 'object',
            properties: {
              productId:  { type: 'string', description: 'Product UUID' },
              quantity:   { type: 'number', description: 'Quantity to order' },
              unitPrice:  { type: 'number', description: 'Price per unit in INR' },
            },
            required: ['productId', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['supplierId', 'warehouseId', 'items'],
    },
    requiredPermission: 'purchase_orders:write',
  },
  {
    name: 'create_shipment',
    description: 'Create a new shipment linked to a purchase order. The PO must be approved or ordered. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        purchaseOrderId:  { type: 'string', description: 'Purchase order UUID this shipment fulfils' },
        warehouseId:      { type: 'string', description: 'Destination warehouse UUID' },
        carrier:          { type: 'string', description: 'Carrier name, e.g. FedEx, BlueDart' },
        trackingNumber:   { type: 'string', description: 'Carrier tracking number (optional)' },
        expectedArrival:  { type: 'string', description: 'Expected arrival date in YYYY-MM-DD format (optional)' },
        notes:            { type: 'string', description: 'Optional notes' },
      },
      required: ['purchaseOrderId', 'warehouseId'],
    },
    requiredPermission: 'shipments:write',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  // UPDATE
  {
    name: 'approve_purchase_order',
    description: 'Approve a pending purchase order. Admin only. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Purchase order UUID to approve' },
      },
      required: ['id'],
    },
    requiredPermission: 'purchase_orders:write',
    allowedRoles: ['admin'],
  },
  {
    name: 'update_po_status',
    description: 'Update a purchase order status to ordered, received, or cancelled. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        id:     { type: 'string', description: 'Purchase order UUID' },
        status: { type: 'string', description: 'New status: ordered, received, or cancelled' },
        notes:  { type: 'string', description: 'Optional reason or notes for the status change' },
      },
      required: ['id', 'status'],
    },
    requiredPermission: 'purchase_orders:write',
  },
  {
    name: 'adjust_stock_level',
    description: 'Adjust the stock quantity of an inventory item by a positive or negative delta. Call list_inventory first to find the item ID. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        inventoryItemId: { type: 'string', description: 'Inventory item UUID' },
        quantity:        { type: 'number', description: 'Amount to add (positive) or remove (negative) from current stock. For example, +50 to receive goods or -10 to write off damaged units.' },
        reason:          { type: 'string', description: 'Reason for the adjustment, e.g. "cycle count", "received goods", "damaged goods written off"' },
      },
      required: ['inventoryItemId', 'quantity', 'reason'],
    },
    requiredPermission: 'inventory:write',
  },
  {
    name: 'update_shipment_status',
    description: 'Update a shipment status to in_transit or delivered. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        id:            { type: 'string', description: 'Shipment UUID' },
        status:        { type: 'string', description: 'New status: in_transit or delivered' },
        actualArrival: { type: 'string', description: 'Actual arrival date in YYYY-MM-DD, required when marking as delivered' },
        notes:         { type: 'string', description: 'Optional notes' },
      },
      required: ['id', 'status'],
    },
    requiredPermission: 'shipments:write',
  },
  {
    name: 'resolve_alert',
    description: 'Mark an alert as resolved. Call list_alerts first to find the alert ID. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Alert UUID to resolve' },
      },
      required: ['id'],
    },
    requiredPermission: 'alerts:read',
    allowedRoles: ['admin', 'procurement_manager', 'warehouse_staff'],
  },
  // PRODUCTS — update / deactivate / reactivate
  {
    name: 'update_product',
    description: 'Edit an existing product\'s details such as name, price, category, reorder level, or lead time. Call list_products first to find the product ID. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        id:           { type: 'string', description: 'Product UUID' },
        name:         { type: 'string', description: 'New display name (optional)' },
        description:  { type: 'string', description: 'New description (optional)' },
        category:     { type: 'string', description: 'New category (optional)' },
        unit:         { type: 'string', description: 'New unit of measure (optional)' },
        unitPrice:    { type: 'number', description: 'New unit price in INR (optional)' },
        reorderLevel: { type: 'number', description: 'New reorder level (optional)' },
        leadTimeDays: { type: 'number', description: 'New lead time in days (optional)' },
      },
      required: ['id'],
    },
    requiredPermission: 'products:write',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  {
    name: 'deactivate_product',
    description: 'Deactivate (soft-delete) a product so it no longer appears in active listings and cannot be ordered. Admin only. Call list_products first to find the ID. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Product UUID to deactivate' },
      },
      required: ['id'],
    },
    requiredPermission: 'products:write',
    allowedRoles: ['admin'],
  },
  {
    name: 'reactivate_product',
    description: 'Reactivate a previously deactivated product. Admin only. Call list_products with isActive=false first to find deactivated products. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Product UUID to reactivate' },
      },
      required: ['id'],
    },
    requiredPermission: 'products:write',
    allowedRoles: ['admin'],
  },
  // SUPPLIERS — create / update
  {
    name: 'create_supplier',
    description: 'Add a new supplier to the system. Always confirm with the user before calling this.',
    parameters: {
      type: 'object',
      properties: {
        name:         { type: 'string', description: 'Supplier company name' },
        contactName:  { type: 'string', description: 'Primary contact person name (optional)' },
        email:        { type: 'string', description: 'Contact email (optional)' },
        phone:        { type: 'string', description: 'Contact phone number (optional)' },
        address:      { type: 'string', description: 'Street address (optional)' },
        city:         { type: 'string', description: 'City (optional)' },
        country:      { type: 'string', description: 'Country (optional)' },
        paymentTerms: { type: 'string', description: 'Payment terms e.g. Net 30 (optional)' },
        leadTimeDays: { type: 'number', description: 'Default lead time in days (optional)' },
      },
      required: ['name'],
    },
    requiredPermission: 'suppliers:read',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  {
    name: 'update_supplier',
    description: 'Update an existing supplier\'s details. Call list_suppliers first to find the supplier ID. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        id:           { type: 'string', description: 'Supplier UUID' },
        name:         { type: 'string', description: 'New name (optional)' },
        contactName:  { type: 'string', description: 'New contact person (optional)' },
        email:        { type: 'string', description: 'New email (optional)' },
        phone:        { type: 'string', description: 'New phone (optional)' },
        address:      { type: 'string', description: 'New address (optional)' },
        city:         { type: 'string', description: 'New city (optional)' },
        country:      { type: 'string', description: 'New country (optional)' },
        paymentTerms: { type: 'string', description: 'New payment terms (optional)' },
        leadTimeDays: { type: 'number', description: 'New lead time in days (optional)' },
      },
      required: ['id'],
    },
    requiredPermission: 'suppliers:read',
    allowedRoles: ['admin', 'procurement_manager'],
  },
  // WAREHOUSES — create / update
  {
    name: 'create_warehouse',
    description: 'Add a new warehouse to the system. Admin only. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        name:        { type: 'string', description: 'Warehouse name' },
        address:     { type: 'string', description: 'Street address (optional)' },
        city:        { type: 'string', description: 'City (optional)' },
        country:     { type: 'string', description: 'Country (optional)' },
        capacity:    { type: 'number', description: 'Max units capacity (optional, no limit if omitted)' },
        managerName: { type: 'string', description: 'Manager name (optional)' },
      },
      required: ['name'],
    },
    requiredPermission: 'warehouses:write',
    allowedRoles: ['admin'],
  },
  {
    name: 'update_warehouse',
    description: 'Update an existing warehouse\'s details. Admin only. Call list_warehouses first to find the ID. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'Warehouse UUID' },
        name:        { type: 'string', description: 'New name (optional)' },
        address:     { type: 'string', description: 'New address (optional)' },
        city:        { type: 'string', description: 'New city (optional)' },
        country:     { type: 'string', description: 'New country (optional)' },
        capacity:    { type: 'number', description: 'New capacity in units (optional)' },
        managerName: { type: 'string', description: 'New manager name (optional)' },
      },
      required: ['id'],
    },
    requiredPermission: 'warehouses:write',
    allowedRoles: ['admin'],
  },
  // USERS — list / role / activate
  {
    name: 'list_users',
    description: 'List system users. Can filter by role or active status. Admin and procurement manager only.',
    parameters: {
      type: 'object',
      properties: {
        role:     { type: 'string',  description: 'Filter by role: admin, procurement_manager, warehouse_staff, supplier, viewer (optional)' },
        isActive: { type: 'boolean', description: 'true = active users only, false = inactive only (optional, default all)' },
        search:   { type: 'string',  description: 'Search by name or email (optional)' },
        limit:    { type: 'number',  description: 'Max rows to return, default 20' },
      },
    },
    requiredPermission: 'users:read',
  },
  {
    name: 'change_user_role',
    description: 'Change the role of a user. Admin only. Call list_users first to find the user ID. For warehouse_staff role a warehouseId is required; for supplier role a supplierId is required. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        userId:      { type: 'string', description: 'User UUID' },
        role:        { type: 'string', description: 'New role: admin, procurement_manager, warehouse_staff, supplier, viewer' },
        warehouseId: { type: 'string', description: 'Required when role is warehouse_staff' },
        supplierId:  { type: 'string', description: 'Required when role is supplier' },
      },
      required: ['userId', 'role'],
    },
    requiredPermission: 'users:write',
    allowedRoles: ['admin'],
  },
  {
    name: 'set_user_active',
    description: 'Activate or deactivate a user account. Admin and procurement manager only. Call list_users first to find the user ID. Always confirm before calling.',
    parameters: {
      type: 'object',
      properties: {
        userId:   { type: 'string',  description: 'User UUID' },
        isActive: { type: 'boolean', description: 'true to activate, false to deactivate' },
      },
      required: ['userId', 'isActive'],
    },
    requiredPermission: 'users:read',
    allowedRoles: ['admin', 'procurement_manager'],
  },
];

// ─── RBAC filter ───────────────────────────────────────────────────────────────

function getToolsForRole(role) {
  const { ROLE_PERMISSIONS } = require('../middleware/rbac');
  const perms  = ROLE_PERMISSIONS[role] || [];
  const hasAll = perms.includes('*');

  return TOOLS
    .filter(t =>
      (hasAll || perms.includes(t.requiredPermission)) &&
      (!t.allowedRoles || t.allowedRoles.includes(role))
    )
    .map(({ name, description, parameters }) => ({ name, description, parameters }));
}

// ─── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name, args, scope) {
  switch (name) {
    case 'get_daily_briefing': {
      const [alerts, pendingPOs, lowStock, inTransit] = await Promise.all([
        alertsService.list({ isResolved: false, severity: 'critical', limit: 5 }, scope),
        purchaseOrderService.list({ status: 'pending', limit: 5 }, scope),
        inventoryService.list({ lowStock: true, limit: 8 }, scope),
        shipmentsService.list({ status: 'in_transit', limit: 5 }, scope),
      ]);
      return { criticalAlerts: alerts, pendingApprovals: pendingPOs, lowStockItems: lowStock, inTransitShipments: inTransit };
    }

    case 'get_dashboard_summary':
      return dashboardService.getSummary(scope);

    case 'list_inventory':
      return inventoryService.list({ limit: args.limit || 12, lowStock: args.lowStock }, scope);

    case 'list_purchase_orders':
      return purchaseOrderService.list({ limit: args.limit || 10, status: args.status }, scope);

    case 'get_purchase_order':
      return purchaseOrderService.getById(args.id, scope);

    case 'list_shipments':
      return shipmentsService.list({ limit: args.limit || 10, status: args.status }, scope);

    case 'get_shipment':
      return shipmentsService.getByNumber(args.shipmentNumber, scope);

    case 'list_alerts':
      return alertsService.list({
        limit: args.limit || 10,
        severity: args.severity,
        isResolved: args.isResolved !== undefined ? args.isResolved : false,
      }, scope);

    case 'list_suppliers':
      return suppliersService.list({ limit: 50, search: args.search }, scope);

    case 'list_products':
      return productsService.list({ limit: args.limit || 30, search: args.search });

    case 'list_warehouses':
      return warehousesService.list({ limit: 50 }, scope);

    case 'create_product':
      return productsService.create({
        sku:           args.sku,
        name:          args.name,
        description:   args.description   || null,
        category:      args.category      || null,
        unit:          args.unit          || 'piece',
        unitPrice:     args.unitPrice     ?? 0,
        reorderLevel:  args.reorderLevel  ?? 0,
        leadTimeDays:  args.leadTimeDays  ?? 0,
      }, scope);

    case 'create_inventory_item':
      return inventoryService.create({
        warehouseId:  args.warehouseId,
        productId:    args.productId,
        quantity:     args.quantity,
        reorderPoint: args.reorderPoint ?? 0,
      }, scope);

    case 'create_purchase_order':
      return purchaseOrderService.create({
        supplierId:   args.supplierId,
        warehouseId:  args.warehouseId,
        expectedDate: args.expectedDate || null,
        notes:        args.notes || null,
        items:        args.items.map(i => ({
          productId: i.productId,
          quantity:  i.quantity,
          unitPrice: i.unitPrice,
        })),
      }, scope);

    case 'create_shipment':
      return shipmentsService.create({
        purchaseOrderId: args.purchaseOrderId,
        warehouseId:     args.warehouseId,
        carrier:         args.carrier || null,
        trackingNumber:  args.trackingNumber || null,
        expectedArrival: args.expectedArrival || null,
        notes:           args.notes || null,
      }, scope);

    case 'approve_purchase_order':
      return purchaseOrderService.approve(args.id, scope);

    case 'update_po_status':
      return purchaseOrderService.updateStatus(args.id, args.status, scope, args.notes);

    case 'adjust_stock_level':
      return inventoryService.adjust(args.inventoryItemId, {
        quantity: args.quantity,
        reason:   args.reason,
      }, scope);

    case 'update_shipment_status':
      return shipmentsService.updateStatus(args.id, {
        status:        args.status,
        actualArrival: args.actualArrival || null,
        notes:         args.notes || null,
      }, scope);

    case 'resolve_alert':
      return alertsService.resolve(args.id, scope);

    case 'update_product':
      return productsService.update(args.id, {
        name:         args.name         || null,
        description:  args.description  || null,
        category:     args.category     || null,
        unit:         args.unit         || null,
        unitPrice:    args.unitPrice    ?? null,
        reorderLevel: args.reorderLevel ?? null,
        leadTimeDays: args.leadTimeDays ?? null,
      }, scope);

    case 'deactivate_product':
      return productsService.remove(args.id, scope);

    case 'reactivate_product':
      return productsService.reactivate(args.id, scope);

    case 'create_supplier':
      return suppliersService.create({
        name:         args.name,
        contactName:  args.contactName  || null,
        email:        args.email        || null,
        phone:        args.phone        || null,
        address:      args.address      || null,
        city:         args.city         || null,
        country:      args.country      || null,
        paymentTerms: args.paymentTerms || null,
        leadTimeDays: args.leadTimeDays ?? 0,
      }, scope);

    case 'update_supplier':
      return suppliersService.update(args.id, {
        name:         args.name         || null,
        contactName:  args.contactName  || null,
        email:        args.email        || null,
        phone:        args.phone        || null,
        address:      args.address      || null,
        city:         args.city         || null,
        country:      args.country      || null,
        paymentTerms: args.paymentTerms || null,
        leadTimeDays: args.leadTimeDays ?? null,
      }, scope);

    case 'create_warehouse':
      return warehousesService.create({
        name:        args.name,
        address:     args.address     || null,
        city:        args.city        || null,
        country:     args.country     || null,
        capacity:    args.capacity    ?? null,
        managerName: args.managerName || null,
      }, scope);

    case 'update_warehouse':
      return warehousesService.update(args.id, {
        name:        args.name        || null,
        address:     args.address     || null,
        city:        args.city        || null,
        country:     args.country     || null,
        capacity:    args.capacity    ?? null,
        managerName: args.managerName || null,
      }, scope);

    case 'list_users':
      return usersService.list({
        limit:    args.limit    || 20,
        role:     args.role     || undefined,
        isActive: args.isActive !== undefined ? args.isActive : undefined,
        search:   args.search   || undefined,
      }, scope);

    case 'change_user_role':
      return usersService.changeRole(args.userId, args.role, {
        warehouseId: args.warehouseId || null,
        supplierId:  args.supplierId  || null,
      }, scope);

    case 'set_user_active':
      return usersService.setActive(args.userId, args.isActive, scope);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(user) {
  return `You are Synapse AI, the intelligent assistant built into the Synapse Supply Chain Management platform.

Current user: ${user.email}
Role: ${user.role}
Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}

You help users manage inventory, purchase orders, shipments, alerts, suppliers, warehouses, products, and users using plain English.

FORMATTING RULES — strictly follow these:
- Never use markdown. No **, *, #, ##, ___, backticks, or any other markdown symbols.
- Write in plain text only.
- For lists, use a simple dash and space: "- item" on its own line.
- For amounts use the rupee symbol: e.g. Rs. 1,500.

BEHAVIOUR RULES:
- For any operation that writes or changes data (create, update, approve, resolve, deactivate, change role), describe exactly what you will do and ask the user to confirm before executing. Wait for explicit confirmation.
- After a tool returns data, summarise it clearly and concisely.
- If the user asks for something they cannot do due to their role, explain what access is needed.
- When creating a purchase order, always call list_suppliers, list_products, and list_warehouses first to resolve names to IDs — never guess at IDs.
- When creating an inventory item, always call list_products and list_warehouses first.
- When updating or deactivating a product, supplier, or warehouse, call the relevant list tool first to find the ID.
- When changing a user role, call list_users first to find the user ID; if the new role is warehouse_staff also call list_warehouses, if supplier also call list_suppliers.
- When the user references a PO by its number (e.g. PO-MR94ICQ3), call list_purchase_orders first to get its UUID, then use that for further actions.
- Keep responses concise and actionable.
- Never mention tool names or internal implementation details.`;
}

// ─── Retry-aware generateContent wrapper ──────────────────────────────────────
// If Gemini returns a per-minute 429 with a short retryDelay, wait and retry once.
// Delays > 60 s (daily quota exhausted) are re-thrown so the controller can show
// the "quota reached" message.

async function callGemini(params) {
  try {
    return await ai.models.generateContent(params);
  } catch (err) {
    const msg      = String(err?.message || '');
    const is429    = err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
    const secMatch = is429 && msg.match(/\b(\d+)s\b/);
    const delaySec = secMatch ? parseInt(secMatch[1], 10) : null;

    if (is429 && delaySec && delaySec <= 60) {
      console.log(`[AI] rate-limited — retrying in ${delaySec}s…`);
      await new Promise(r => setTimeout(r, delaySec * 1000 + 200));
      try {
        return await ai.models.generateContent(params);
      } catch (retryErr) {
        retryErr._retryExhausted = true; // signal: quota is truly gone, not just throttled
        throw retryErr;
      }
    }
    throw err;
  }
}

// ─── Markdown stripper ────────────────────────────────────────────────────────
// Safety net: remove common markdown symbols in case the model ignores instructions.

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/gs, '$1')        // *italic* → italic
    .replace(/_{2}(.+?)_{2}/gs, '$1')    // __bold__ → bold
    .replace(/_(.+?)_/gs, '$1')          // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, '')         // ## Heading → Heading
    .replace(/`([^`]+)`/g, '$1')         // `code` → code
    .replace(/^\*\s+/gm, '- ')           // * item → - item
}

// ─── Main entry point ──────────────────────────────────────────────────────────

async function generateReply(dbMessages, user, scope) {
  const toolDeclarations = getToolsForRole(user.role);

  const config = {
    systemInstruction: buildSystemPrompt(user),
    maxOutputTokens:   1024,
  };
  if (toolDeclarations.length > 0) {
    config.tools = [{ functionDeclarations: toolDeclarations }];
  }

  // Convert DB message history to Gemini format
  const contents = dbMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  let lastResponse;

  for (let round = 0; round < 6; round++) {
    lastResponse = await callGemini({
      model:    'gemini-2.5-flash',
      contents,
      config,
    });

    const fnCalls = lastResponse.functionCalls;
    console.log(`[AI] round ${round} — fnCalls:`, fnCalls?.map(f => f.name), '| finishReason:', lastResponse.candidates?.[0]?.finishReason);

    if (!fnCalls || fnCalls.length === 0) break; // final text answer — done

    // Append model's turn
    const modelParts = lastResponse.candidates?.[0]?.content?.parts || [];
    contents.push({ role: 'model', parts: modelParts });

    // Execute every tool call and collect results
    const resultParts = [];
    for (const fn of fnCalls) {
      let toolOutput;
      try {
        toolOutput = await executeTool(fn.name, fn.args || {}, scope);
        // Serialize to plain JSON so Gemini can read it (removes Date objects etc.)
        toolOutput = JSON.parse(JSON.stringify(toolOutput));
      } catch (err) {
        toolOutput = { error: err.message };
      }
      console.log(`[AI] tool ${fn.name} → ${JSON.stringify(toolOutput).slice(0, 120)}`);
      resultParts.push({
        functionResponse: {
          name:     fn.name,
          response: toolOutput,
        },
      });
    }

    // Append tool results as a user turn
    contents.push({ role: 'user', parts: resultParts });
  }

  console.log('[AI] final text:', lastResponse?.text?.slice?.(0, 100));
  const raw  = lastResponse?.text ?? null;
  const text = raw ? stripMarkdown(raw) : null;

  return {
    text:       text || 'I was unable to generate a response. Please try again.',
    tokensUsed: lastResponse?.usageMetadata?.totalTokenCount || 0,
  };
}

module.exports = { generateReply };
