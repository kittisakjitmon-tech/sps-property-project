export const PROPERTY_TYPES = [
    { id: 'SPS-S-1CLASS-ID', label: 'บ้านเดี่ยว 1 ชั้น' },
    { id: 'SPS-S-2CLASS-ID', label: 'บ้านเดี่ยว 2 ชั้น' },
    { id: 'SPS-TW-1CLASS-ID', label: 'บ้านแฝด 1 ชั้น' },
    { id: 'SPS-TW-2CLASS-ID', label: 'บ้านแฝด 2 ชั้น' },
    { id: 'SPS-TH-1CLASS-ID', label: 'ทาวน์โฮม 1 ชั้น' },
    { id: 'SPS-TH-2CLASS-ID', label: 'ทาวน์โฮม 2 ชั้น' },
    { id: 'SPS-PV-ID', label: 'บ้านพูลวิลล่า' },
    { id: 'SPS-CD-ID', label: 'คอนโด' },
    { id: 'SPS-LD-ID', label: 'ที่ดินเปล่า' },
    { id: 'SPS-RP-ID', label: 'บ้านเช่า/ผ่อนตรง' }
];

export function getPropertyLabel(idOrLabel) {
    if (!idOrLabel) return '';
    const match = PROPERTY_TYPES.find(pt => pt.id === idOrLabel);
    return match ? match.label : idOrLabel;
}
