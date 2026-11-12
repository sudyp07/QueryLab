import { describe,it,expect } from 'vitest';
import Papa from 'papaparse';
import { toCSV, fromBase64, toBase64, normalizeResult, quoteId, sqlValue } from '../lib/utils';
describe('import/export utilities',()=>{
 it('escapes CSV quotes, commas and newlines',()=>{const csv=toCSV(['name','memo'],[['Ada, B','She said "hi"'],['C','two\nlines']]);const result=Papa.parse<string[]>(csv,{skipEmptyLines:true});expect(result.data).toEqual([['name','memo'],['Ada, B','She said "hi"'],['C','two\nlines']]);});
 it('round trips SQLite bytes through JSON safe base64',()=>{const bytes=Uint8Array.from([0,1,2,3,127,254,255]);expect(fromBase64(toBase64(bytes))).toEqual(bytes);});
 it('escapes SQL identifiers and values',()=>{expect(quoteId('hello"there')).toBe('"hello""there"');expect(sqlValue("O'Reilly")).toBe("'O''Reilly'");expect(sqlValue(null)).toBe('NULL');});
 it('compares equivalent result datasets independent of row order',()=>{expect(normalizeResult([{name:'a',gpa:3},{name:'b',gpa:4}])).toBe(normalizeResult([{gpa:4,name:'b'},{name:'a',gpa:3}]));});
});
