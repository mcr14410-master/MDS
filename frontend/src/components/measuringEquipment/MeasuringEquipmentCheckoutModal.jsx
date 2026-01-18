import { useState } from 'react';
import { useMeasuringEquipmentStore } from '../../stores/measuringEquipmentStore';
import { toast } from '../Toaster';

/**
 * Modal für Messmittel Entnehmen/Zurückgeben
 * 
 * Props:
 * - equipment: Das Messmittel-Objekt
 * - mode: 'checkout' oder 'return'
 * - onClose: Callback nach Schließen (success: boolean)
 */
export default function MeasuringEquipmentCheckoutModal({ equipment, mode, onClose }) {
  const { checkoutEquipment, returnEquipment } = useMeasuringEquipmentStore();
  const [loading, setLoading] = useState(false);
  
  // Checkout-Felder
  const [purpose, setPurpose] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  
  // Return-Felder
  const [returnCondition, setReturnCondition] = useState('ok');
  const [returnNotes, setReturnNotes] = useState('');

  const isCheckout = mode === 'checkout';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isCheckout && !purpose.trim()) {
      toast.error('Bitte Verwendungszweck angeben');
      return;
    }

    setLoading(true);
    try {
      if (isCheckout) {
        await checkoutEquipment(equipment.id, {
          purpose: purpose.trim(),
          work_order_number: workOrder.trim() || null,
          expected_return_date: expectedReturn || null
        });
        toast.success(`${equipment.inventory_number} entnommen`);
      } else {
        await returnEquipment(equipment.id, {
          return_condition: returnCondition,
          return_notes: returnNotes.trim() || null
        });
        toast.success(`${equipment.inventory_number} zurückgegeben`);
      }
      onClose(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
          onClick={() => onClose(false)}
        />

        <div className="relative inline-block w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {isCheckout ? (
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              ) : (
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isCheckout ? 'Messmittel entnehmen' : 'Messmittel zurückgeben'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {equipment.inventory_number} - {equipment.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isCheckout ? (
              <>
                {/* Checkout: Zweck */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Verwendungszweck *
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="z.B. Qualitätsprüfung Bauteil XY"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* Checkout: Auftragsnummer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auftragsnummer
                  </label>
                  <input
                    type="text"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value)}
                    placeholder="z.B. FA-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Checkout: Erwartete Rückgabe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Erwartete Rückgabe
                  </label>
                  <input
                    type="date"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Return: Zustand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zustand bei Rückgabe *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="radio"
                        name="condition"
                        value="ok"
                        checked={returnCondition === 'ok'}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100">OK - Einwandfreier Zustand</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="radio"
                        name="condition"
                        value="damaged"
                        checked={returnCondition === 'damaged'}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="w-4 h-4 text-red-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100">Beschädigt</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <input
                        type="radio"
                        name="condition"
                        value="needs_calibration"
                        checked={returnCondition === 'needs_calibration'}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="w-4 h-4 text-yellow-600"
                      />
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-900 dark:text-gray-100">Kalibrierung erforderlich</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Return: Notizen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Anmerkungen
                  </label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={2}
                    placeholder="Optional: Bemerkungen zur Rückgabe..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  isCheckout 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? 'Wird gespeichert...' : (isCheckout ? 'Entnehmen' : 'Zurückgeben')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
