import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Clock,
  Truck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  ShieldAlert,
  AlertOctagon,
  BedDouble,
  GitMerge,
  UserCheck,
  Radio,
  FileSpreadsheet,
  Boxes,
  Activity,
  RefreshCw,
  ShieldCheck,
  Check,
  X,
  Building2,
  Calendar
} from 'lucide-react';
import type { Language } from '../../i18n';
import type {
  RetailInvoice,
  ColdChainLog,
  ADRReport,
  Referral,
  BedOccupancy,
  DutyRoster,
  DiseaseSurveillance,
  StrategicReserve
} from '../../types';
import {
  FALLBACK_INVOICES,
  FALLBACK_COLD_CHAIN_LOGS,
  FALLBACK_ADR_REPORTS,
  FALLBACK_REFERRALS,
  FALLBACK_BEDS,
  FALLBACK_DUTY_ROSTER,
  FALLBACK_SURVEILLANCE,
  FALLBACK_STRATEGIC_RESERVES
} from '../../db/demoFallbackData';

// ============================================================================
// 1. FAST POS BILLING & GST INVOICES (RETAIL PHARMACIST)
// ============================================================================
export function PosBillingScreen({ lang, pharmacyId = 'pharma_valparai_01' }: { lang: Language; pharmacyId?: string }) {
  const isTa = lang === 'ta';
  const [invoices, setInvoices] = useState<RetailInvoice[]>(FALLBACK_INVOICES as any);
  const [patientName, setPatientName] = useState('M. Arumugam');
  const [patientPhone, setPatientPhone] = useState('+91 94432 11223');
  const [doctorName, setDoctorName] = useState('Dr. Sundaram, MD');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [selectedMed, setSelectedMed] = useState('med_pcm');
  const [qty, setQty] = useState(10);
  const [unitPrice, setUnitPrice] = useState(1.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeInvoiceDetail, setActiveInvoiceDetail] = useState<RetailInvoice | null>(null);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/pharmacy/invoices?pharmacy_id=${pharmacyId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      setInvoices(FALLBACK_INVOICES as any);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [pharmacyId]);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const medName = selectedMed === 'med_pcm' ? 'Paracetamol 500mg Tab' :
                    selectedMed === 'med_amox' ? 'Amoxicillin 500mg Cap' :
                    selectedMed === 'med_ors' ? 'ORS Sachet 20.5g' : 'Cetirizine 10mg Tab';
    const payload = {
      pharmacy_id: pharmacyId,
      patient_name: patientName,
      patient_phone: patientPhone,
      doctor_name: doctorName,
      payment_mode: paymentMode,
      items: [
        {
          medicine_id: selectedMed,
          medicine_name: medName,
          batch: 'BTH-' + new Date().getFullYear(),
          qty: Number(qty),
          unit_price: Number(unitPrice),
          gst_rate: 12.0
        }
      ]
    };

    try {
      const res = await fetch('/api/pharmacy/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const inv = await res.json();
        setActiveInvoiceDetail(inv);
        await fetchInvoices();
      }
    } catch {
      const sub = qty * unitPrice;
      const gst = sub * 0.12;
      const fakeInv: RetailInvoice = {
        id: 'inv-' + Date.now(),
        invoice_number: `INV-2026-${Math.floor(Math.random() * 900000) + 100000}`,
        pharmacy_id: pharmacyId,
        patient_name: patientName,
        patient_phone: patientPhone,
        doctor_name: doctorName,
        items: [{ medicine_id: selectedMed, medicine_name: medName, batch: 'BTH-OFFLINE', qty, unit_price: unitPrice, gst_rate: 12.0, line_total: sub + gst }],
        subtotal: sub,
        cgst: gst / 2,
        sgst: gst / 2,
        total_amount: sub + gst,
        payment_mode: paymentMode,
        created_by: 'Retail Pharmacist',
        created_at: new Date().toISOString()
      };
      setInvoices(prev => [fakeInv, ...prev]);
      setActiveInvoiceDetail(fakeInv);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Receipt className="text-[#0F6B6B]" size={20} />
            {isTa ? 'வேகமான விற்பனை பில்லிங் & GST ரசீது' : 'Fast Retail POS Billing & GST Counter'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'நேரலை இருப்பு கழிப்பு, தானியங்கி GST கணக்கீடு, மற்றும் உடனடி ரசீது தயாரித்தல்.'
              : 'Real-time stock deduction, automated 12% GST breakdown, and digital customer invoices.'}
          </p>
        </div>
        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          <span>GSTIN: 33AAAAA0000A1Z5</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Form */}
        <div className="lg:col-span-1 bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">New Counter Bill</h2>
          <form onSubmit={handleCreateBill} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Customer / Patient Name</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Customer Mobile</label>
              <input
                type="text"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Prescribing Doctor (Optional)</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Select Medicine</label>
              <select
                value={selectedMed}
                onChange={(e) => {
                  setSelectedMed(e.target.value);
                  if (e.target.value === 'med_pcm') setUnitPrice(1.5);
                  else if (e.target.value === 'med_amox') setUnitPrice(7.0);
                  else if (e.target.value === 'med_ors') setUnitPrice(18.0);
                  else setUnitPrice(3.5);
                }}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
              >
                <option value="med_pcm">Paracetamol 500mg Tab (₹1.50/tab)</option>
                <option value="med_amox">Amoxicillin 500mg Cap (₹7.00/cap)</option>
                <option value="med_ors">ORS Sachet 20.5g (₹18.00/sachet)</option>
                <option value="med_cetirizine">Cetirizine 10mg Tab (₹3.50/tab)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'UPI', 'CARD'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 rounded-lg border font-bold text-center text-xs ${
                      paymentMode === mode ? 'bg-[#0F6B6B] text-white border-[#0F6B6B]' : 'bg-[#F7F9FB] text-[#5B6B7A] border-[#E3E8EE]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F7F9FB] p-3 rounded-lg space-y-1 text-xs border border-[#E3E8EE]">
              <div className="flex justify-between text-[#5B6B7A]">
                <span>Subtotal:</span>
                <span>₹{(qty * unitPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5B6B7A]">
                <span>GST (12%):</span>
                <span>₹{(qty * unitPrice * 0.12).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#14202B] pt-1 border-t border-[#E3E8EE] text-sm">
                <span>Total Amount:</span>
                <span className="text-[#0F6B6B]">₹{(qty * unitPrice * 1.12).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Receipt size={14} />
              <span>{isSubmitting ? 'Generating Invoice...' : 'Generate Invoice & Deduct Stock'}</span>
            </button>
          </form>
        </div>

        {/* Invoices List & Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h2 className="text-sm font-bold text-[#14202B]">Recent Retail POS Invoices</h2>
              <span className="text-xs text-[#5B6B7A]">{invoices.length} invoices recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0F6B6B]">{inv.invoice_number}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#14202B]">{inv.patient_name}</div>
                        <div className="text-[10px] text-[#5B6B7A]">{inv.patient_phone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          {inv.payment_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">₹{inv.subtotal.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">₹{(inv.cgst + inv.sgst).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#14202B] tabular-nums">₹{inv.total_amount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setActiveInvoiceDetail(inv)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#0F6B6B] hover:bg-teal-50 rounded"
                        >
                          View Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {activeInvoiceDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E3E8EE] p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
              <div>
                <span className="text-[10px] font-extrabold bg-teal-100 text-[#0F6B6B] px-2 py-0.5 rounded-full">
                  OFFICIAL TAX INVOICE
                </span>
                <h3 className="text-base font-bold text-[#14202B] mt-1">{activeInvoiceDetail.invoice_number}</h3>
              </div>
              <button onClick={() => setActiveInvoiceDetail(null)} className="text-[#5B6B7A] p-1 rounded-md hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F9FB] p-3 rounded-xl border border-[#E3E8EE]">
              <div>
                <span className="text-[10px] text-[#5B6B7A] font-semibold block">Customer Details</span>
                <div className="font-bold text-[#14202B]">{activeInvoiceDetail.patient_name}</div>
                <div className="text-[#5B6B7A]">{activeInvoiceDetail.patient_phone}</div>
              </div>
              <div>
                <span className="text-[10px] text-[#5B6B7A] font-semibold block">Date & Payment</span>
                <div className="font-bold text-[#14202B]">{activeInvoiceDetail.created_at.split('T')[0]}</div>
                <div className="text-emerald-700 font-bold">Paid via {activeInvoiceDetail.payment_mode}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#14202B]">Billed Line Items</h4>
              <div className="border border-[#E3E8EE] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE]">
                    {(activeInvoiceDetail.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-[#14202B]">{it.medicine_name}</td>
                        <td className="py-2 px-3">{it.qty}</td>
                        <td className="py-2 px-3 text-right">₹{it.unit_price}</td>
                        <td className="py-2 px-3 text-right font-bold">₹{it.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1 text-xs pt-2 border-t border-[#E3E8EE]">
              <div className="flex justify-between text-[#5B6B7A]">
                <span>Subtotal:</span>
                <span>₹{activeInvoiceDetail.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5B6B7A]">
                <span>CGST (6%):</span>
                <span>₹{activeInvoiceDetail.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5B6B7A]">
                <span>SGST (6%):</span>
                <span>₹{activeInvoiceDetail.sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#0F6B6B] pt-1 border-t border-[#E3E8EE]">
                <span>Grand Total:</span>
                <span>₹{activeInvoiceDetail.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveInvoiceDetail(null)}
                className="px-4 py-2 bg-[#0F6B6B] text-white text-xs font-bold rounded-xl"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. SUPPLIER ORDERS & PURCHASE ORDERS (RETAIL PHARMACIST)
// ============================================================================
export function SuppliersOrdersScreen({ lang }: { lang: Language }) {
  const isTa = lang === 'ta';
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('sup_cbe_dist');
  const [selectedMed, setSelectedMed] = useState('med_pcm');
  const [orderQty, setOrderQty] = useState(500);
  const [unitPrice, setUnitPrice] = useState(1.2);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });

  const fetchData = async () => {
    try {
      const [supRes, poRes] = await Promise.all([
        fetch('/api/suppliers').then(r => r.ok ? r.json() : []),
        fetch('/api/purchase-orders').then(r => r.ok ? r.json() : [])
      ]);
      setSuppliers(supRes);
      setOrders(poRes);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: 'pharmacy',
          owner_id: 'pharma_valparai_01',
          supplier_id: selectedSupplier,
          medicine_id: selectedMed,
          quantity: Number(orderQty),
          unit_price: Number(unitPrice),
          expected_delivery_date: deliveryDate
        })
      });
      if (res.ok) {
        setShowPoModal(false);
        fetchData();
      }
    } catch {
      setShowPoModal(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Truck className="text-[#0F6B6B]" size={20} />
            {isTa ? 'சப்ளையர் நெட்வொர்க் & கொள்முதல் ஆர்டர்கள்' : 'Supplier Network & Purchase Orders'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அங்கீகரிக்கப்பட்ட மருந்து சப்ளையர்களிடம் ஆர்டர் செய்தல் மற்றும் விநியோக கண்காணிப்பு.'
              : 'Direct replenishment from verified pharmaceutical distributors with automated lead-time tracking.'}
          </p>
        </div>
        <button
          onClick={() => setShowPoModal(true)}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>Create Purchase Order</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approved Suppliers */}
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">Approved Pharma Suppliers</h2>
          <div className="space-y-3">
            {suppliers.map((s) => (
              <div key={s.id} className="p-3 bg-[#F7F9FB] rounded-xl border border-[#E3E8EE] flex items-start justify-between text-xs">
                <div>
                  <div className="font-bold text-[#14202B]">{s.supplier_name}</div>
                  <div className="text-[11px] text-[#5B6B7A]">{s.contact_person} · {s.phone}</div>
                  <div className="text-[10px] text-teal-800 font-mono mt-0.5">Lic: {s.license_number}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    Lead: {s.lead_time_days} days
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">Active Purchase Orders</h2>
          <div className="space-y-3">
            {orders.map((po) => (
              <div key={po.id} className="p-3 bg-[#F7F9FB] rounded-xl border border-[#E3E8EE] flex items-start justify-between text-xs">
                <div>
                  <div className="font-bold font-mono text-[#0F6B6B]">{po.po_reference}</div>
                  <div className="font-semibold text-[#14202B] mt-0.5">{po.medicine_id} · {po.quantity} units</div>
                  <div className="text-[10px] text-[#5B6B7A]">Expected Delivery: {po.expected_delivery_date}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                    po.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {po.status}
                  </span>
                  <div className="text-[10px] font-bold text-[#14202B] mt-1">₹{(po.quantity * (po.unit_price || 1)).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h3 className="text-sm font-bold text-[#14202B]">Create Supplier Purchase Order</h3>
              <button onClick={() => setShowPoModal(false)} className="text-[#5B6B7A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Supplier</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                >
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Medicine</label>
                <select
                  value={selectedMed}
                  onChange={(e) => setSelectedMed(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                >
                  <option value="med_pcm">Paracetamol 500mg</option>
                  <option value="med_amox">Amoxicillin 500mg</option>
                  <option value="med_ors">ORS Sachets 20.5g</option>
                  <option value="med_cetirizine">Cetirizine 10mg</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button type="button" onClick={() => setShowPoModal(false)} className="px-3 py-2 border border-[#E3E8EE] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0F6B6B] text-white font-bold rounded-lg">Submit Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. COLD CHAIN MONITORING & EXCURSIONS (PHC PHARMACIST)
// ============================================================================
export function ColdChainScreen({ lang, facilityId = 'phc_valparai' }: { lang: Language; facilityId?: string }) {
  const isTa = lang === 'ta';
  const [logs, setLogs] = useState<ColdChainLog[]>(FALLBACK_COLD_CHAIN_LOGS as any);
  const [tempInput, setTempInput] = useState(4.2);
  const [equipmentId, setEquipmentId] = useState('ILR-01');
  const [powerSource, setPowerSource] = useState('MAINS');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/facility/cold-chain?facility_id=${facilityId}`);
      if (res.ok) setLogs(await res.json());
    } catch {
      setLogs(FALLBACK_COLD_CHAIN_LOGS as any);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [facilityId]);

  const handleLogTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/facility/cold-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          equipment_id: equipmentId,
          equipment_type: equipmentId.startsWith('ILR') ? 'ILR' : 'DF',
          temperature_celsius: Number(tempInput),
          power_source: powerSource,
          notes
        })
      });
      if (res.ok) {
        setNotes('');
        await fetchLogs();
      }
    } catch {
      const isExc = tempInput < 2.0 || tempInput > 8.0;
      const fakeLog: ColdChainLog = {
        id: 'cc-' + Date.now(),
        facility_id: facilityId,
        equipment_id: equipmentId,
        equipment_type: equipmentId.startsWith('ILR') ? 'ILR' : 'DF',
        temperature_celsius: tempInput,
        target_min: 2.0,
        target_max: 8.0,
        is_excursion: isExc,
        excursion_severity: isExc ? 'WARNING' : 'NORMAL',
        logged_by: 'PHC Pharmacist',
        power_source: powerSource,
        notes,
        created_at: new Date().toISOString()
      };
      setLogs(prev => [fakeLog, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Thermometer className="text-[#0F6B6B]" size={20} />
            {isTa ? 'குளிர்சாதன சங்கிலி வெப்பநிலை கண்காணிப்பு (2°C - 8°C)' : 'PHC Cold Chain & Vaccine Integrity Log'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'பனி உறைந்த குளிர்சாதன பெட்டிகள் (ILR) மற்றும் ஆழ் உறைவிப்பான் (Deep Freezer) நேரலை வெப்பநிலை பதிவு.'
              : 'Ice-Lined Refrigerators (ILR) and Deep Freezer (DF) temperature monitoring with automated excursion alerts.'}
          </p>
        </div>
        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
          Optimal Zone: +2.0°C to +8.0°C
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logger Card */}
        <div className="lg:col-span-1 bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">Log Refrigerator Reading</h2>
          <form onSubmit={handleLogTemp} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Equipment Unit</label>
              <select
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
              >
                <option value="ILR-01">ILR-01 (Ice-Lined Refrigerator, 140L)</option>
                <option value="ILR-02">ILR-02 (Auxiliary Vaccine Storage)</option>
                <option value="DF-01">DF-01 (Deep Freezer for OPV & Ice packs)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Current Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                value={tempInput}
                onChange={(e) => setTempInput(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg font-bold text-base text-[#14202B]"
              />
              <span className={`text-[11px] font-bold block mt-1 ${
                tempInput >= 2.0 && tempInput <= 8.0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {tempInput >= 2.0 && tempInput <= 8.0 ? '✓ Safe Storage Range (2°C - 8°C)' : '⚠ TEMPERATURE EXCURSION ALERT'}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Active Power Source</label>
              <select
                value={powerSource}
                onChange={(e) => setPowerSource(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
              >
                <option value="MAINS">Mains Grid (TNEB Active)</option>
                <option value="SOLAR">Solar Photovoltaic Inverter</option>
                <option value="GENERATOR">Diesel Backup Generator</option>
                <option value="BATTERY">Battery / Holdover Reserve</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Remarks / Action Taken</label>
              <input
                type="text"
                placeholder="Compressor status, seal integrity..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Thermometer size={14} />
              <span>{isSubmitting ? 'Recording...' : 'Submit Temperature Log'}</span>
            </button>
          </form>
        </div>

        {/* Temperature History Table */}
        <div className="lg:col-span-2 bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
            <h2 className="text-sm font-bold text-[#14202B]">Temperature Integrity Audit Trail</h2>
            <span className="text-xs text-[#5B6B7A]">{logs.length} logged entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Equipment</th>
                  <th className="py-2.5 px-3">Temperature</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Power</th>
                  <th className="py-2.5 px-3">Auditor</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#14202B]">{l.equipment_id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono font-bold text-sm ${l.is_excursion ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {l.temperature_celsius.toFixed(1)}°C
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        !l.is_excursion ? 'bg-emerald-100 text-emerald-800' :
                        l.excursion_severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.is_excursion ? `EXCURSION (${l.excursion_severity})` : 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#5B6B7A]">{l.power_source}</td>
                    <td className="py-2.5 px-3 text-[#5B6B7A]">{l.logged_by}</td>
                    <td className="py-2.5 px-3 text-right text-[#5B6B7A]">{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. ADVERSE DRUG REACTION (ADR) PHARMACOVIGILANCE
// ============================================================================
export function AdrScreen({ lang, facilityId = 'phc_valparai' }: { lang: Language; facilityId?: string }) {
  const isTa = lang === 'ta';
  const [adrs, setAdrs] = useState<ADRReport[]>(FALLBACK_ADR_REPORTS as any);
  const [age, setAge] = useState(38);
  const [gender, setGender] = useState('Female');
  const [medicineId, setMedicineId] = useState('med_amox');
  const [batch, setBatch] = useState('BTH-AMX-2026');
  const [reaction, setReaction] = useState('Generalised urticaria and facial puffiness 45 minutes after ingestion');
  const [severity, setSeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING'>('MODERATE');
  const [outcome, setOutcome] = useState('RECOVERED');
  const [actionTaken, setActionTaken] = useState('DRUG_WITHDRAWN');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdrs = async () => {
    try {
      const res = await fetch(`/api/facility/adr?facility_id=${facilityId}`);
      if (res.ok) setAdrs(await res.json());
    } catch {
      setAdrs(FALLBACK_ADR_REPORTS as any);
    }
  };

  useEffect(() => {
    fetchAdrs();
  }, [facilityId]);

  const handleCreateAdr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/facility/adr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          patient_age: Number(age),
          patient_gender: gender,
          medicine_id: medicineId,
          batch_number: batch,
          reaction_description: reaction,
          onset_date: new Date().toISOString().split('T')[0],
          severity,
          outcome,
          action_taken: actionTaken
        })
      });
      if (res.ok) {
        setReaction('');
        await fetchAdrs();
      }
    } catch {
      const fakeAdr: ADRReport = {
        id: 'adr-' + Date.now(),
        report_reference: `ADR-2026-${Math.floor(Math.random() * 90000) + 10000}`,
        facility_id: facilityId,
        patient_age: age,
        patient_gender: gender,
        medicine_id: medicineId,
        batch_number: batch,
        reaction_description: reaction,
        onset_date: new Date().toISOString().split('T')[0],
        severity,
        outcome,
        action_taken: actionTaken,
        reported_by: 'PHC Pharmacist',
        reported_by_role: 'pharmacist',
        created_at: new Date().toISOString()
      };
      setAdrs(prev => [fakeAdr, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <AlertOctagon className="text-amber-700" size={20} />
            {isTa ? 'பக்கவிளைவு அறிக்கை & மருந்து பாதுகாப்பு (PvPI)' : 'Adverse Drug Reaction (ADR) Pharmacovigilance'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'மருந்து பக்கவிளைவுகளை தேசிய மருந்தாக்கவியல் திட்டத்திற்கு (PvPI) பதிவு செய்தல்.'
              : 'Official reporting under Pharmacovigilance Programme of India (PvPI) for patient safety monitoring.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">Report Suspected Reaction</h2>
          <form onSubmit={handleCreateAdr} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Patient Age</label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Suspected Medicine</label>
              <select
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
              >
                <option value="med_amox">Amoxicillin 250mg / 500mg</option>
                <option value="med_pcm">Paracetamol 500mg</option>
                <option value="med_metformin">Metformin 500mg</option>
                <option value="med_alben">Albendazole 400mg</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Batch Number</label>
              <input
                type="text"
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Severity Tier</label>
              <select
                value={severity}
                onChange={(e: any) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
              >
                <option value="MILD">MILD (Self-limiting)</option>
                <option value="MODERATE">MODERATE (Required medical intervention)</option>
                <option value="SEVERE">SEVERE (Prolonged hospitalization)</option>
                <option value="LIFE_THREATENING">LIFE THREATENING (Anaphylaxis / ICU)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Reaction Description</label>
              <textarea
                rows={2}
                required
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <AlertOctagon size={14} />
              <span>{isSubmitting ? 'Transmitting to PvPI...' : 'File PvPI ADR Dossier'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
            <h2 className="text-sm font-bold text-[#14202B]">Reported Pharmacovigilance Signals</h2>
            <span className="text-xs text-[#5B6B7A]">{adrs.length} reports logged</span>
          </div>

          <div className="space-y-3">
            {adrs.map((a) => (
              <div key={a.id} className="p-4 bg-[#F7F9FB] rounded-xl border border-[#E3E8EE] space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-amber-800">{a.report_reference}</span>
                    <h3 className="font-bold text-[#14202B] mt-0.5">{a.medicine_id} · Batch: {a.batch_number}</h3>
                    <p className="text-[#5B6B7A]">Patient: {a.patient_age} yrs, {a.patient_gender} · Onset: {a.onset_date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    a.severity === 'LIFE_THREATENING' ? 'bg-red-100 text-red-800' :
                    a.severity === 'SEVERE' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.severity}
                  </span>
                </div>
                <p className="bg-white p-2.5 rounded-lg border border-[#E3E8EE] text-[#14202B]">
                  <strong>Reaction:</strong> {a.reaction_description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#5B6B7A] pt-1">
                  <span>Action: <strong>{a.action_taken}</strong></span>
                  <span className="text-emerald-700 font-bold">Outcome: {a.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. CHC INPATIENT BEDS & OCCUPANCY (CHC OFFICER)
// ============================================================================
export function ChcBedsScreen({ lang, facilityId = 'chc_pollachi' }: { lang: Language; facilityId?: string }) {
  const isTa = lang === 'ta';
  const [beds, setBeds] = useState<BedOccupancy[]>(FALLBACK_BEDS as any);
  const [selectedWard, setSelectedWard] = useState('General Male Ward');
  const [totalBeds, setTotalBeds] = useState(20);
  const [occupiedBeds, setOccupiedBeds] = useState(15);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBeds = async () => {
    try {
      const res = await fetch(`/api/chc/beds?facility_id=${facilityId}`);
      if (res.ok) setBeds(await res.json());
    } catch {
      setBeds(FALLBACK_BEDS as any);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [facilityId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/chc/beds/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          ward_name: selectedWard,
          total_beds: Number(totalBeds),
          occupied_beds: Number(occupiedBeds)
        })
      });
      if (res.ok) await fetchBeds();
    } catch {
      setBeds(prev => prev.map(b => b.ward_name === selectedWard ? { ...b, total_beds: totalBeds, occupied_beds: occupiedBeds } : b));
    } finally {
      setIsUpdating(false);
    }
  };

  const totalAll = beds.reduce((acc, b) => acc + b.total_beds, 0);
  const occupiedAll = beds.reduce((acc, b) => acc + b.occupied_beds, 0);
  const occupancyPct = totalAll > 0 ? Math.round((occupiedAll / totalAll) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <BedDouble className="text-[#0F6B6B]" size={20} />
            {isTa ? 'CHC உள்நோயாளி படுக்கை திறன் & ICU மேலாண்மை' : 'CHC Inpatient Bed Capacity & ICU Stabilization'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'வார்டு வாரியான படுக்கை இருப்பு, ஆக்சிஜன் வசதி மற்றும் அவசர சிகிச்சை பிரிவு கண்காணிப்பு.'
              : 'Ward-wise bed availability, oxygen support, and emergency ICU census tracking.'}
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-teal-50 border border-teal-200 text-[#0F6B6B] rounded-lg text-xs font-extrabold">
          Overall Census: {occupiedAll} / {totalAll} Beds ({occupancyPct}%)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {beds.map((b) => {
          const pct = Math.round((b.occupied_beds / b.total_beds) * 100);
          return (
            <div key={b.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#14202B]">{b.ward_name}</h3>
                  <span className="text-[10px] text-[#5B6B7A]">Updated by {b.last_updated_by}</span>
                </div>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  pct >= 90 ? 'bg-rose-100 text-rose-800' : pct >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {pct}% Full
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#5B6B7A]">
                  <span>Occupancy:</span>
                  <span className="font-bold text-[#14202B]">{b.occupied_beds} of {b.total_beds}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F7F9FB] p-2.5 rounded-lg border border-[#E3E8EE]">
                <div>
                  <span className="text-[#5B6B7A] block">Oxygen Beds:</span>
                  <span className="font-bold text-[#0F6B6B]">{b.oxygen_supported_beds} Supported</span>
                </div>
                <div>
                  <span className="text-[#5B6B7A] block">Ventilators:</span>
                  <span className="font-bold text-[#14202B]">{b.ventilator_beds} Active</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#14202B] pb-2 border-b border-[#E3E8EE]">Update Ward Census</h2>
        <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
          <div>
            <label className="block font-semibold text-[#14202B] mb-1">Ward Selection</label>
            <select
              value={selectedWard}
              onChange={(e) => {
                setSelectedWard(e.target.value);
                const found = beds.find(b => b.ward_name === e.target.value);
                if (found) {
                  setTotalBeds(found.total_beds);
                  setOccupiedBeds(found.occupied_beds);
                }
              }}
              className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
            >
              {beds.map(b => <option key={b.id} value={b.ward_name}>{b.ward_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[#14202B] mb-1">Total Bed Capacity</label>
            <input
              type="number"
              min="1"
              value={totalBeds}
              onChange={(e) => setTotalBeds(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#14202B] mb-1">Currently Occupied</label>
            <input
              type="number"
              min="0"
              value={occupiedBeds}
              onChange={(e) => setOccupiedBeds(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdating}
            className="py-2.5 px-4 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg transition-colors shadow-xs"
          >
            {isUpdating ? 'Saving...' : 'Update Census'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 6. CHC PATIENT REFERRALS (INBOUND & OUTBOUND)
// ============================================================================
export function ChcReferralsScreen({ lang, facilityId = 'chc_pollachi' }: { lang: Language; facilityId?: string }) {
  const isTa = lang === 'ta';
  const [referrals, setReferrals] = useState<Referral[]>(FALLBACK_REFERRALS as any);
  const [showModal, setShowModal] = useState(false);
  const [patientName, setPatientName] = useState('Murugesan K.');
  const [age, setAge] = useState(52);
  const [gender, setGender] = useState('Male');
  const [fromFacility, setFromFacility] = useState('phc_valparai');
  const [toFacility, setToFacility] = useState('chc_pollachi');
  const [reason, setReason] = useState('Hypertensive emergency; BP 200/120 mmHg, headache and blurring of vision');
  const [urgency, setUrgency] = useState<'ROUTINE' | 'PRIORITY' | 'EMERGENCY'>('EMERGENCY');
  const [notes, setNotes] = useState('Amlodipine 10mg stat given; shifted via 108 Ambulance');

  const fetchReferrals = async () => {
    try {
      const res = await fetch(`/api/chc/referrals?facility_id=${facilityId}`);
      if (res.ok) setReferrals(await res.json());
    } catch {
      setReferrals(FALLBACK_REFERRALS as any);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [facilityId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/chc/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_age: Number(age),
          patient_gender: gender,
          from_facility_id: fromFacility,
          to_facility_id: toFacility,
          referral_reason: reason,
          urgency,
          clinical_notes: notes
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchReferrals();
      }
    } catch {
      setShowModal(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/chc/referrals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchReferrals();
    } catch {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <GitMerge className="text-[#0F6B6B]" size={20} />
            {isTa ? 'நோயாளி பரிந்துரை நெட்வொர்க் (PHC ⇄ CHC)' : 'Clinical Referral Network (PHC ⇄ CHC)'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அவசர சிகிச்சை மற்றும் உயர் மருத்துவமனைக்கு பரிந்துரைக்கப்பட்ட நோயாளிகளின் கண்காணிப்பு.'
              : 'Tracking incoming emergency transfers and specialist outbound referrals with 108 ambulance coordination.'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>New Referral Dossier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {referrals.map((r) => (
          <div key={r.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-[#0F6B6B]">
                    {r.referral_code}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    r.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                    r.urgency === 'PRIORITY' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {r.urgency}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#14202B] mt-1.5">{r.patient_name} ({r.patient_age}y, {r.patient_gender})</h3>
                <p className="text-xs text-[#5B6B7A]">From: <strong className="text-[#14202B]">{r.from_facility_id}</strong> ➔ To: <strong className="text-[#14202B]">{r.to_facility_id}</strong></p>
              </div>

              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md ${
                r.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-800' :
                r.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="bg-[#F7F9FB] p-3 rounded-lg text-xs space-y-1.5 border border-[#E3E8EE]">
              <div>
                <strong className="text-[#14202B]">Indication:</strong> <span className="text-[#5B6B7A]">{r.referral_reason}</span>
              </div>
              {r.clinical_notes && (
                <div>
                  <strong className="text-[#14202B]">Clinical Notes:</strong> <span className="text-[#5B6B7A]">{r.clinical_notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E3E8EE] text-xs">
              <span className="text-[#5B6B7A]">Doctor: {r.referring_doctor}</span>
              <div className="flex gap-1.5">
                {r.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'ADMITTED')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px]"
                  >
                    Admit Patient
                  </button>
                )}
                {r.status === 'ADMITTED' && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, 'DISCHARGED')}
                    className="px-2.5 py-1 border border-gray-300 hover:bg-gray-50 text-[#14202B] font-bold rounded-lg text-[10px]"
                  >
                    Discharge
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h3 className="text-sm font-bold text-[#14202B]">Create Emergency Referral</h3>
              <button onClick={() => setShowModal(false)} className="text-[#5B6B7A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e: any) => setUrgency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="PRIORITY">PRIORITY</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Clinical Indication</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Initial Stabilization & Meds Given</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border border-[#E3E8EE] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0F6B6B] text-white font-bold rounded-lg">Transmit Referral</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. CHC WORKFORCE SHIFT & DUTY ROSTER
// ============================================================================
export function ChcRosterScreen({ lang, facilityId = 'chc_pollachi' }: { lang: Language; facilityId?: string }) {
  const isTa = lang === 'ta';
  const [roster, setRoster] = useState<DutyRoster[]>(FALLBACK_DUTY_ROSTER as any);
  const [showModal, setShowModal] = useState(false);
  const [staffName, setStaffName] = useState('Dr. S. Mohan');
  const [roleTitle, setRoleTitle] = useState('Medical Officer');
  const [shift, setShift] = useState('Morning (08:00 - 14:00)');
  const [phone, setPhone] = useState('+91 94431 88990');

  const fetchRoster = async () => {
    try {
      const res = await fetch(`/api/chc/roster?facility_id=${facilityId}`);
      if (res.ok) setRoster(await res.json());
    } catch {
      setRoster(FALLBACK_DUTY_ROSTER as any);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [facilityId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/chc/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: facilityId,
          staff_name: staffName,
          role_title: roleTitle,
          shift,
          roster_date: new Date().toISOString().split('T')[0],
          status: 'ON_DUTY',
          contact_number: phone
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchRoster();
      }
    } catch {
      setShowModal(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <UserCheck className="text-[#0F6B6B]" size={20} />
            {isTa ? 'மருத்துவ பணியாளர் பணி அட்டவணை (Duty Roster)' : 'Clinical Workforce Shift & Duty Roster'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'மருத்துவர்கள், தலைமை செவிலியர்கள் மற்றும் மருந்தாளர்களின் பணி நேரம் மற்றும் நேரலை நிலை.'
              : 'Daily shift assignments, on-duty clinical officers, casualty doctors, and emergency contacts.'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>Assign Duty Shift</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roster.map((r) => (
          <div key={r.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#14202B]">{r.staff_name}</h3>
                <span className="text-xs font-semibold text-[#0F6B6B]">{r.role_title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                r.status === 'ON_DUTY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="bg-[#F7F9FB] p-3 rounded-lg text-xs space-y-1 border border-[#E3E8EE]">
              <div>
                <span className="text-[#5B6B7A]">Shift: </span>
                <strong className="text-[#14202B]">{r.shift}</strong>
              </div>
              <div>
                <span className="text-[#5B6B7A]">Phone: </span>
                <span className="font-mono text-[#14202B]">{r.contact_number || '+91 94431 00000'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h3 className="text-sm font-bold text-[#14202B]">Assign Staff Shift</h3>
              <button onClick={() => setShowModal(false)} className="text-[#5B6B7A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Clinical Role</label>
                  <select
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="Medical Officer">Medical Officer</option>
                    <option value="Casualty MO">Casualty MO</option>
                    <option value="Staff Nurse">Staff Nurse</option>
                    <option value="Chief Pharmacist">Chief Pharmacist</option>
                    <option value="Lab Technician">Lab Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Shift Timing</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="Morning (08:00 - 14:00)">Morning (08:00 - 14:00)</option>
                    <option value="Evening (14:00 - 20:00)">Evening (14:00 - 20:00)</option>
                    <option value="Night (20:00 - 08:00)">Night (20:00 - 08:00)</option>
                    <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border border-[#E3E8EE] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0F6B6B] text-white font-bold rounded-lg">Save Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 8. OUTBREAK SURVEILLANCE - IDSP (DISTRICT & STATE OFFICER)
// ============================================================================
export function SurveillanceScreen({ lang, districtId = 'coimbatore' }: { lang: Language; districtId?: string }) {
  const isTa = lang === 'ta';
  const [reports, setReports] = useState<DiseaseSurveillance[]>(FALLBACK_SURVEILLANCE as any);
  const [showModal, setShowModal] = useState(false);
  const [disease, setDisease] = useState('Dengue Fever');
  const [cases, setCases] = useState(16);
  const [villages, setVillages] = useState('Valparai Tea Estates Ward 3');
  const [action, setAction] = useState('Vector control team dispatched; 400 paracetamol strips positioned.');
  const [alertLevel, setAlertLevel] = useState<'NORMAL' | 'WATCH' | 'OUTBREAK_WARNING' | 'EPIDEMIC_SURGE'>('OUTBREAK_WARNING');

  const fetchSurveillance = async () => {
    try {
      const res = await fetch(`/api/district/surveillance?district_id=${districtId}`);
      if (res.ok) setReports(await res.json());
    } catch {
      setReports(FALLBACK_SURVEILLANCE as any);
    }
  };

  useEffect(() => {
    fetchSurveillance();
  }, [districtId]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/district/surveillance/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          district_id: districtId,
          facility_id: 'phc_valparai',
          disease_name: disease,
          reported_cases: Number(cases),
          suspected_cases: Number(cases) + 8,
          confirmed_cases: Math.round(Number(cases) * 0.6),
          reporting_week: '2026-W41',
          reporting_date: new Date().toISOString().split('T')[0],
          alert_level: alertLevel,
          affected_villages: villages,
          action_taken: action
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchSurveillance();
      }
    } catch {
      setShowModal(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Radio className="text-[#0F6B6B]" size={20} />
            {isTa ? 'நோய் பரவல் தீவிர கண்காணிப்பு (IDSP Outbreak Monitor)' : 'IDSP Integrated Disease Surveillance & Outbreak Radar'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'டெங்கு, வயிற்றுப்போக்கு மற்றும் காய்ச்சல் பரவல் கண்காணிப்பு மற்றும் தடுப்பு நடவடிக்கை.'
              : 'Epidemiological cluster detection, CUSUM aberration alarms, and proactive preventive replenishment.'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>Report Outbreak Signal</span>
        </button>
      </div>

      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-[#0F6B6B] px-2 py-0.5 rounded">
                    {r.surveillance_code}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    r.alert_level === 'OUTBREAK_WARNING' ? 'bg-rose-100 text-rose-800' :
                    r.alert_level === 'WATCH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {r.alert_level}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#14202B] mt-1">{r.disease_name}</h3>
                <p className="text-xs text-[#5B6B7A]">District: {r.district_id} · Reported by {r.reported_by}</p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#14202B]">{r.reported_cases}</span>
                <span className="text-[10px] text-[#5B6B7A] block">Cases in {r.reporting_week}</span>
              </div>
            </div>

            <div className="bg-[#F7F9FB] p-3 rounded-lg text-xs space-y-1 border border-[#E3E8EE]">
              <div>
                <strong className="text-[#14202B]">Affected Clusters:</strong> <span className="text-[#5B6B7A]">{r.affected_villages}</span>
              </div>
              <div>
                <strong className="text-[#14202B]">Mitigation Action:</strong> <span className="text-[#5B6B7A]">{r.action_taken}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h3 className="text-sm font-bold text-[#14202B]">File Outbreak Surveillance Alert</h3>
              <button onClick={() => setShowModal(false)} className="text-[#5B6B7A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Disease Name</label>
                <input
                  type="text"
                  required
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Case Count</label>
                  <input
                    type="number"
                    min="1"
                    value={cases}
                    onChange={(e) => setCases(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Alert Severity</label>
                  <select
                    value={alertLevel}
                    onChange={(e: any) => setAlertLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="WATCH">WATCH</option>
                    <option value="OUTBREAK_WARNING">OUTBREAK WARNING</option>
                    <option value="EPIDEMIC_SURGE">EPIDEMIC SURGE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Affected Villages / Hamlets</label>
                <input
                  type="text"
                  value={villages}
                  onChange={(e) => setVillages(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Containment & Medicine Stock Action</label>
                <textarea
                  rows={2}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border border-[#E3E8EE] rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0F6B6B] text-white font-bold rounded-lg">Submit IDSP Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. CONSOLIDATED DISTRICT INDENTS (DISTRICT & STATE OFFICER)
// ============================================================================
export function DistrictIndentsScreen({ lang, districtId = 'coimbatore' }: { lang: Language; districtId?: string }) {
  const isTa = lang === 'ta';
  const [indentData, setIndentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/district/indents/consolidate?district_id=${districtId}`)
      .then(r => r.json())
      .then(d => { setIndentData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [districtId]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <FileSpreadsheet className="text-[#0F6B6B]" size={20} />
            {isTa ? 'ஒருங்கிணைந்த மாவட்ட மருந்து தேவைகள் (Indent Consolidation)' : 'Consolidated District Indents & Central Procurement Needs'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அனைத்து ஆரம்ப சுகாதார நிலையங்களின் (PHC) தேவைகளை தொகுத்து மாவட்ட கிடங்குக்கு சமர்ப்பித்தல்.'
              : 'Aggregating all forecasted PHC shortages into a bulk district replenishment manifest for Tamil Nadu Medical Services Corporation (TNMSC).'}
          </p>
        </div>
      </div>

      {indentData && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
            <h2 className="text-sm font-bold text-[#14202B]">
              District Procurement Requisition ({indentData.total_critical_medicines} Molecules Requiring Urgent Indent)
            </h2>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-[#E3E8EE] hover:bg-[#F7F9FB] text-xs font-semibold"
            >
              Print Requisition
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Essential Medicine</th>
                  <th className="py-2.5 px-3">Affected Facilities</th>
                  <th className="py-2.5 px-3 text-right">Earliest Stockout</th>
                  <th className="py-2.5 px-3 text-right">Bulk Indent Quantity</th>
                  <th className="py-2.5 px-3">Primary Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {(indentData.consolidated_indents || []).map((it: any) => (
                  <tr key={it.medicine_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#14202B]">{it.medicine_name}</div>
                      <div className="text-[10px] font-mono text-[#5B6B7A]">{it.medicine_id}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {it.affected_facilities_count} Primary Centres
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#14202B]">
                      {it.fastest_stockout_days.toFixed(1)} Days
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-[#0F6B6B] tabular-nums text-sm">
                      {it.total_recommended_order_qty.toLocaleString()} {it.unit}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                        TNMSC Bulk Order
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 10. NATIONAL STRATEGIC RESERVES & PROCUREMENT PIPELINE (NATIONAL OFFICER)
// ============================================================================
export function NationalReservesScreen({ lang }: { lang: Language }) {
  const isTa = lang === 'ta';
  const [reserves, setReserves] = useState<StrategicReserve[]>(FALLBACK_STRATEGIC_RESERVES as any);
  const [procurement, setProcurement] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reserves' | 'procurement' | 'pharmacovigilance'>('reserves');
  const [pharmaData, setPharmaData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/national/reserves').then(r => r.json()).then(d => setReserves(d)).catch(() => {});
    fetch('/api/national/procurement').then(r => r.json()).then(d => setProcurement(d)).catch(() => {});
    fetch('/api/national/pharmacovigilance').then(r => r.json()).then(d => setPharmaData(d)).catch(() => {});
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Boxes className="text-[#0F6B6B]" size={20} />
            {isTa ? 'தேசிய மூலோபாய இருப்பு & மருந்து சப்ளை செயின்' : 'National Strategic Buffer Reserves & Central Procurement'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'மத்திய மருத்துவ சேமிப்பு கிடங்குகள் (CMSD) மற்றும் அவசர கால இருப்பு கண்காணிப்பு.'
              : 'Autonomous nationwide buffer reserves across Central Medical Store Depots (CMSDs) under Ministry of Health & Family Welfare.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('reserves')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'reserves' ? 'bg-[#0F6B6B] text-white' : 'border border-[#E3E8EE] text-[#5B6B7A]'}`}
          >
            Buffer Reserves
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'procurement' ? 'bg-[#0F6B6B] text-white' : 'border border-[#E3E8EE] text-[#5B6B7A]'}`}
          >
            National Pipeline
          </button>
          <button
            onClick={() => setActiveTab('pharmacovigilance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'pharmacovigilance' ? 'bg-[#0F6B6B] text-white' : 'border border-[#E3E8EE] text-[#5B6B7A]'}`}
          >
            PvPI Signal Hub
          </button>
        </div>
      </div>

      {activeTab === 'reserves' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reserves.map((r) => (
            <div key={r.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-extrabold text-xs text-[#0F6B6B] bg-teal-50 px-2 py-0.5 rounded">
                    {r.depot_code}
                  </span>
                  <h3 className="text-sm font-bold text-[#14202B] mt-1">{r.depot_name}</h3>
                  <p className="text-xs font-semibold text-emerald-800">{r.medicine_name || r.medicine_id}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  Buffer Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F9FB] p-3 rounded-lg border border-[#E3E8EE]">
                <div>
                  <span className="text-[10px] text-[#5B6B7A] block">Total In Buffer</span>
                  <span className="font-bold text-base text-[#14202B]">{r.buffer_quantity.toLocaleString()} units</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5B6B7A] block">Allocated / Reserved</span>
                  <span className="font-bold text-base text-amber-700">{r.reserved_quantity.toLocaleString()} units</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-[#E3E8EE] flex justify-between text-[11px] text-[#5B6B7A]">
                  <span>Manager: <strong>{r.depot_manager}</strong></span>
                  <span>Inspected: {r.last_inspected}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'procurement' && procurement && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-teal-800 uppercase">National Contract Pipeline</span>
              <div className="text-2xl font-extrabold text-[#0F6B6B]">{procurement.total_contract_value_inr}</div>
              <span className="text-[10px] text-[#5B6B7A]">{procurement.active_central_contracts} Standing Central Orders</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Supply Chain Resilience</span>
              <div className="text-2xl font-extrabold text-emerald-700">{procurement.supply_chain_resilience_score}%</div>
              <span className="text-[10px] text-[#5B6B7A]">Multi-source vendor redundancy</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <span className="text-[11px] font-bold text-blue-800 uppercase">Average Lead Time</span>
              <div className="text-2xl font-extrabold text-blue-700">{procurement.average_supplier_lead_time_days} Days</div>
              <span className="text-[10px] text-[#5B6B7A]">Factory to Regional Buffer Depot</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pharmacovigilance' && pharmaData && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
            <h2 className="text-sm font-bold text-[#14202B]">
              National Pharmacovigilance Signal Aggregation ({pharmaData.total_reported_events} Nationwide Signals)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(pharmaData.severity_breakdown || {}).map(([sev, count]: [string, any]) => (
              <div key={sev} className="bg-[#F7F9FB] border border-[#E3E8EE] p-3 rounded-lg text-xs">
                <span className="text-[10px] font-bold text-[#5B6B7A] uppercase">{sev}</span>
                <div className="text-xl font-extrabold text-[#14202B]">{count} Reports</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
