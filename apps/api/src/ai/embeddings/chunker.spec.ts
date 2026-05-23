import { chunkText } from './chunker';

describe('chunkText', () => {
  it('emits multiple bounded chunks for long text', () => {
    const text = 'Heading\n\n' + 'Sentence one. Sentence two. '.repeat(400);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.tokenCount).toBeLessThanOrEqual(620);
  });

  it('preserves a detected header as headerHint for following chunks', () => {
    const chunks = chunkText('CREDIT POLICY V3\n\n' + 'Repayment terms run from 12 to 60 months. '.repeat(20));
    expect(chunks[0]?.headerHint).toMatch(/CREDIT/);
  });
});
