-- Add 'delivered' as an explicit terminal state for shipments.
-- The frontend uses 'delivered' as the final step; 'arrived'/'completed' are kept for
-- backward compatibility but are not used in the application flow.
ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'delivered';
