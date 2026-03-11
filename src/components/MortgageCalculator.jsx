import { useState } from 'react'

export default function MortgageCalculator({ price, directInstallment }) {
  const [loanType, setLoanType] = useState(directInstallment ? 'direct' : 'bank')
  const [downPercent, setDownPercent] = useState(20)
  const [years, setYears] = useState(20)
  const [bankInterestRate, setBankInterestRate] = useState(3.5)
  const [directInterestRate, setDirectInterestRate] = useState(2.5)

  const down = Math.round((price * downPercent) / 100)
  const loan = price - down
  const interestRate = loanType === 'direct' ? directInterestRate : bankInterestRate
  const monthlyRate = interestRate / 100 / 12
  const numPayments = years * 12
  const monthlyPayment =
    monthlyRate === 0
      ? loan / numPayments
      : (loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)

  // Generate payment schedule table (12 months)
  const paymentSchedule = []
  let remainingBalance = loan
  for (let i = 1; i <= Math.min(12, numPayments); i++) {
    const interestPayment = remainingBalance * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    remainingBalance -= principalPayment
    paymentSchedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance),
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
      <h3 className="text-lg font-bold text-blue-900 mb-4">คำนวณสินเชื่อบ้าน</h3>
      <div className="space-y-4">
        {/* Loan Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทสินเชื่อ</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLoanType('bank')}
              className={`px-4 py-3 rounded-lg border-2 transition ${
                loanType === 'bank'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              กู้แบงก์
            </button>
            <button
              type="button"
              onClick={() => setLoanType('direct')}
              className={`px-4 py-3 rounded-lg border-2 transition ${
                loanType === 'direct'
                  ? 'border-blue-900 bg-blue-50 text-blue-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              ผ่อนตรง
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">เงินดาวน์ (%)</label>
          <input
            type="range"
            min="10"
            max="50"
            value={downPercent}
            onChange={(e) => setDownPercent(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-slate-600">
            {downPercent}% = {(down / 1_000_000).toFixed(1)} ล้านบาท
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ระยะเวลากู้ (ปี)</label>
          <select
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          >
            {[5, 10, 15, 20, 25, 30].map((y) => (
              <option key={y} value={y}>
                {y} ปี
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            อัตราดอกเบี้ย (% ต่อปี) - {loanType === 'direct' ? 'ผ่อนตรง' : 'กู้แบงก์'}
          </label>
          <input
            type="number"
            step="0.1"
            value={loanType === 'direct' ? directInterestRate : bankInterestRate}
            onChange={(e) => {
              if (loanType === 'direct') {
                setDirectInterestRate(Number(e.target.value))
              } else {
                setBankInterestRate(Number(e.target.value))
              }
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-slate-600 text-sm mb-1">ค่างวดโดยประมาณ</p>
          <p className="text-2xl font-bold text-yellow-900">
            {monthlyPayment.toLocaleString('th-TH', { maximumFractionDigits: 0 })} บาท/เดือน
          </p>
          <p className="text-xs text-slate-500 mt-1">
            รวมทั้งสิ้น {((monthlyPayment * numPayments) / 1_000_000).toFixed(1)} ล้านบาท ({years} ปี)
          </p>
        </div>

        {/* Payment Schedule Table */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">ตารางค่างวด 12 เดือนแรก</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-2 text-left font-medium text-slate-700">เดือน</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">ค่างวด</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">เงินต้น</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">ดอกเบี้ย</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-700">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentSchedule.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-2 py-2 text-slate-600">{row.month}</td>
                    <td className="px-2 py-2 text-right font-medium text-blue-900">
                      {row.payment.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {row.principal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600">
                      {row.interest.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500">
                      {row.balance.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
