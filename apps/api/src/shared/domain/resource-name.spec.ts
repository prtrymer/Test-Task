import { ResourceName } from './resource-name';

describe('ResourceName suffixing', () => {
  it('inserts the suffix before the extension', () => {
    expect(ResourceName.create('report.pdf').withSuffix(2).value).toBe('report (2).pdf');
  });

  it('appends when there is no extension', () => {
    expect(ResourceName.create('report').withSuffix(3).value).toBe('report (3)');
  });

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(ResourceName.create('.env').withSuffix(2).value).toBe('.env (2)');
  });

  it('splits on the last dot only', () => {
    expect(ResourceName.create('q4.final.pdf').withSuffix(2).value).toBe(
      'q4.final (2).pdf',
    );
  });

  it('exposes stem and extension consistently', () => {
    const name = ResourceName.create('balance-sheet.pdf');
    expect(name.stem).toBe('balance-sheet');
    expect(name.extension).toBe('.pdf');
  });
});
