import{briefDates,recapEndDay}from'./briefDates';
test('daily date follows the selected edition; weekly and monthly describe the actual fetched windows',()=>{
 const d=briefDates('2026-11-03','2026-11-03');expect(d.daily).toBe('Tue, Nov 3, 2026');expect(d.weekly).toBe('Oct 26, 2026 – Nov 1, 2026');expect(d.monthly).toBe('Oct 1, 2026 – Oct 31, 2026');
 expect(recapEndDay('2026-11-03','2026-11-03','Weekly')).toBe('2026-11-01');
});
test('Sunday and completed month-end are included; year and leap boundaries stay accurate',()=>{
 expect(briefDates('2026-11-01','2026-11-03').weekly).toBe('Oct 26, 2026 – Nov 1, 2026');
 expect(briefDates('2024-02-29','2024-02-29').monthly).toBe('Feb 1, 2024 – Feb 29, 2024');
 expect(briefDates('2026-01-02','2026-01-02').monthly).toBe('Dec 1, 2025 – Dec 31, 2025');
});
