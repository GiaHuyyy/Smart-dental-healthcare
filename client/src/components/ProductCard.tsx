
export default function ProductCard({ product, onBuy }: { product: any; onBuy?: (p: any) => void }) {
  return (
    <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, display: 'flex', gap: 12, maxWidth: 720 }}>
      <div style={{ width: 120, height: 120, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
        <img src={product.image} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{product.name}</div>
        <div style={{ color: '#666', marginTop: 6 }}>{product.description}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#e6f7ff', color: '#0050b3', padding: '4px 8px', borderRadius: 6 }}>{product.rating} ★</div>
          <div style={{ color: '#888' }}>{product.reviews} reviews</div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => onBuy && onBuy(product)} style={{ padding: '8px 12px', borderRadius: 6, background: '#1890ff', color: '#fff', border: 'none' }}>Mua trên Shopee</button>
          <button style={{ padding: '8px 12px', borderRadius: 6, background: '#fff', border: '1px solid #ccc' }}>Chi tiết</button>
        </div>
      </div>
    </div>
  );
}
