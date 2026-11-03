import{currencySpeech,normalizeCurrencyText}from'./currencySpeech';
test('currency pronunciation preserves magnitude and maps word positions to displayed source text',()=>{
 const source='A $6.1 billion loss. Recovery continues.',spoken=currencySpeech(source);
 expect(spoken.text).toBe('A 6 point one billion dollar loss. Recovery continues.');
 expect(spoken.toSource(spoken.text.indexOf('Recovery'))).toBe(source.indexOf('Recovery'));
 expect(normalizeCurrencyText('$6.01bn')).toBe('6 point zero one billion dollars');
 expect(normalizeCurrencyText('6.1% on Nov 3')).toBe('6.1% on Nov 3');
});
