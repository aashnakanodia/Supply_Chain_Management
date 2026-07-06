import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from '../chat/ChatWidget'
import useSocket from '../../hooks/useSocket'
import { useToast } from '../../hooks/useToast'
import { getAlerts } from '../../api/alerts'
import './AppLayout.css'

export default function AppLayout() {
  const [collapsed,   setCollapsed]   = useState(false)
  const [alertCount,  setAlertCount]  = useState(0)
  const { toast } = useToast()

  // fetch initial unread alert count
  useEffect(() => {
    getAlerts({ isResolved: false, limit: 100 })
      .then(({ data }) => setAlertCount(data.data?.total ?? 0))
      .catch(() => {})
  }, [])

  const handleNewAlert = useCallback((data) => {
    setAlertCount((c) => c + 1)
    toast.warning(`New alert: ${data.title ?? 'Stock alert triggered'}`)
  }, [toast])

  const handleAlertResolved = useCallback(() => {
    setAlertCount((c) => Math.max(0, c - 1))
  }, [])

  const handlePOApproved = useCallback((data) => {
    toast.success(`PO ${data.poNumber ?? ''} approved`)
  }, [toast])

  const handlePOStatusChanged = useCallback((data) => {
    toast.info(`PO ${data.poNumber ?? ''} → ${data.status}`)
  }, [toast])

  const handleShipmentChanged = useCallback((data) => {
    toast.info(`Shipment ${data.shipmentNumber ?? ''} → ${data.status}`)
  }, [toast])

  useSocket({
    NEW_ALERT:               handleNewAlert,
    ALERT_RESOLVED:          handleAlertResolved,
    PO_APPROVED:             handlePOApproved,
    PO_STATUS_CHANGED:       handlePOStatusChanged,
    SHIPMENT_STATUS_CHANGED: handleShipmentChanged,
  })

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        alertCount={alertCount}
      />
      <div className="app-main">
        <TopBar alertCount={alertCount} />
        <main className="app-content">
          <Outlet context={{ alertCount, setAlertCount }} />
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}
