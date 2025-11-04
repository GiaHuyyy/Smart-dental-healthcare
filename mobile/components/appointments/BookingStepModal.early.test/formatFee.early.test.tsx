import { formatFee } from '@/utils/consultationFees';


describe('formatFee() formatFee method', () => {
  // Happy Path Tests
  it('should format a typical integer fee correctly', () => {
    // Test that a standard fee is formatted with thousands separator and "đ"
    expect(formatFee(200000)).toBe('200,000đ');
  });

  it('should format a small fee without thousands separator', () => {
    // Test that a small fee is formatted without separator but with "đ"
    expect(formatFee(500)).toBe('500đ');
  });

  it('should format a fee with decimal part by rounding or truncating as per implementation', () => {
    // Test that a fee with decimals is formatted correctly (usually no decimals in VND)
    expect(formatFee(123456.78)).toBe('123,457đ');
  });

  it('should format a large fee with multiple thousands separators', () => {
    // Test that a large fee is formatted with all necessary separators
    expect(formatFee(123456789)).toBe('123,456,789đ');
  });

  it('should format zero fee as "0đ"', () => {
    // Test that zero is formatted as "0đ"
    expect(formatFee(0)).toBe('0đ');
  });

  // Edge Case Tests
  it('should format a negative fee correctly', () => {
    // Test that a negative fee is formatted with minus sign and "đ"
    expect(formatFee(-150000)).toBe('-150,000đ');
  });

  it('should format a fee with decimal less than 0.5 by rounding down', () => {
    // Test that decimals < 0.5 are rounded down
    expect(formatFee(1234.4)).toBe('1,234đ');
  });

  it('should format a fee with decimal exactly 0.5 by rounding up', () => {
    // Test that decimals == 0.5 are rounded up
    expect(formatFee(1234.5)).toBe('1,235đ');
  });

  it('should format a fee with many decimal places correctly', () => {
    // Test that a fee with many decimals is rounded correctly
    expect(formatFee(999.9999)).toBe('1,000đ');
  });

  it('should format the maximum safe integer fee correctly', () => {
    // Test that the maximum safe integer is formatted correctly
    expect(formatFee(Number.MAX_SAFE_INTEGER)).toBe('9,007,199,254,740,991đ');
  });

  it('should format the minimum safe integer fee correctly', () => {
    // Test that the minimum safe integer is formatted correctly
    expect(formatFee(Number.MIN_SAFE_INTEGER)).toBe('-9,007,199,254,740,991đ');
  });

  it('should format a fee of 1 correctly', () => {
    // Test that a fee of 1 is formatted as "1đ"
    expect(formatFee(1)).toBe('1đ');
  });

  it('should format a fee of -1 correctly', () => {
    // Test that a fee of -1 is formatted as "-1đ"
    expect(formatFee(-1)).toBe('-1đ');
  });
});