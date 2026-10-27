import { describe, expect, it } from 'vitest';
import { decimal, toCsv } from './csv.ts';

describe('toCsv', () => {
  it('writes a header and rows separated by CRLF, as RFC 4180 and Excel expect', () => {
    expect(
      toCsv(
        ['Name', 'Country'],
        [
          ['Ada', 'US'],
          ['Grace', 'GB'],
        ],
      ),
    ).toBe('Name,Country\r\nAda,US\r\nGrace,GB\r\n');
  });

  it('quotes cells with commas, quotes or line breaks, doubling inner quotes', () => {
    expect(toCsv(['A', 'B', 'C'], [['Lovelace, Ada', 'Ada "the Countess"', 'two\nlines']])).toBe(
      'A,B,C\r\n"Lovelace, Ada","Ada ""the Countess""","two\nlines"\r\n',
    );
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])(
    'prefixes text starting with a formula character (%j) with an apostrophe',
    (text) => {
      const line = toCsv(['A'], [[text]]).split('\r\n')[1] ?? '';

      expect(line.replace(/^"|"$/g, '').startsWith(`'${text[0]}`)).toBe(true);
    },
  );

  it('quotes a prefixed cell when it also needs quoting', () => {
    expect(toCsv(['A'], [['=HYPERLINK("http://x","y")']])).toBe(
      'A\r\n"\'=HYPERLINK(""http://x"",""y"")"\r\n',
    );
  });

  it('leaves numbers raw, so Excel can add them up', () => {
    expect(toCsv(['N', 'D'], [[-5, decimal('-12.50')]])).toBe('N,D\r\n-5,-12.50\r\n');
  });

  it('writes a missing value as an empty cell', () => {
    expect(toCsv(['A', 'B'], [[null, 'x']])).toBe('A,B\r\n,x\r\n');
  });

  it('rejects a decimal that is not a plain number', () => {
    expect(() => decimal('=1+1')).toThrow();
  });
});
