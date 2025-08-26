import { useState } from 'react';
import ProductCard from './ProductCard';
import RichChat from './RichChat';

type Msg = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  attachments?: string[];
  richContent?: any;
  options?: string[];
};

export default function RichChatDemo() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [productList, setProductList] = useState<any[] | null>(null);

  function pushMessage(m: Msg) {
    setMessages(prev => [...prev, m]);
  }

  function handleOption(opt: string) {
    // simple handler for demo quick replies
    pushMessage({ id: `${Date.now()}`, type: 'user', content: opt });
    if (opt.toLowerCase().includes('gửi ảnh') || opt.toLowerCase().includes('ảnh')) {
      // RichChat will open file selector; nothing else here
      return;
    }

    // handle other quick replies simply
    if (opt === 'Tiếp tục') {
      pushMessage({ id: `${Date.now()}-bot`, type: 'bot', content: 'Bạn đã chọn tiếp tục. Vui lòng chờ...' });
    }

    if (opt === 'Danh sách sản phẩm' || opt === 'Gợi ý sản phẩm') {
      // show a demo product list
      const sample = [
        { id: 'p1', name: 'Bộ làm trắng răng A', description: 'Gel làm trắng nhẹ nhàng, an toàn cho men răng', image: '/images/prod-whitening-1.jpg', rating: 4.6, reviews: 234 },
        { id: 'p2', name: 'Kem đánh răng whitening B', description: 'Hiệu quả sau 2 tuần, phù hợp răng nhạy cảm', image: '/images/prod-whitening-2.jpg', rating: 4.4, reviews: 128 },
      ];
      setProductList(sample);
      pushMessage({ id: `${Date.now()}-bot`, type: 'bot', content: 'Đây là danh sách sản phẩm gợi ý cho bạn:', richContent: { title: 'Gợi ý sản phẩm làm trắng', highlights: ['An toàn ở VN', 'Hiệu quả trong 2 tuần'] } });
    }
  }

  async function handleImage(file: File, previewUrl: string) {
    // show immediate preview in chat as user message
    pushMessage({ id: `${Date.now()}`, type: 'user', content: '📷 Đã gửi ảnh', attachments: [previewUrl] });

    // upload to server (background). Adjust endpoint/origin if your server runs on another port.
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('sessionId', 'demo-session');
      form.append('userId', 'demo-user');

      const resp = await fetch('/chatbot/upload', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        pushMessage({ id: `${Date.now()}-err`, type: 'bot', content: `❌ Upload thất bại: ${text}` });
        return;
      }

      const data = await resp.json();
      // If your server returns analysis in data.data or data.data.analysisResult
      const botText = data?.data?.message || data?.data?.analysisResult?.diagnosis || 'Đã nhận ảnh. Đang phân tích...';
      const analysis = data?.data?.analysisResult;

      pushMessage({ id: `${Date.now()}-bot`, type: 'bot', content: botText, richContent: analysis ? { title: 'Kết quả phân tích AI', sections: [{ heading: 'Tóm tắt', text: JSON.stringify(analysis) }] } : undefined });

      // if the server returned product suggestions, show them
      const products = data?.data?.products;
      if (Array.isArray(products) && products.length > 0) {
        setProductList(products);
        pushMessage({ id: `${Date.now()}-bot-products`, type: 'bot', content: 'Mình có một vài gợi ý sản phẩm phù hợp:', richContent: { title: 'Sản phẩm gợi ý' } });
      }
    } catch (err: any) {
      pushMessage({ id: `${Date.now()}-err`, type: 'bot', content: `❌ Lỗi khi upload: ${err?.message || err}` });
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => pushMessage({ id: `${Date.now()}`, type: 'user', content: 'Bắt đầu demo' })}
          style={{ padding: '6px 10px', borderRadius: 6 }}
        >
          Bắt đầu demo
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.type === 'bot' ? 'start' : 'end' }}>
            <RichChat
              message={{
                id: m.id,
                type: m.type,
                content: m.content,
                attachments: m.attachments,
                richContent: m.richContent,
                options: m.options || ['Gửi ảnh X-quang', 'Gửi ảnh răng miệng', 'Tiếp tục', 'Kết thúc']
              }}
              onOption={handleOption}
              onImage={handleImage}
            />
          </div>
        ))}

        {productList && (
          <div style={{ display: 'grid', gap: 12 }}>
            {productList.map(p => (
              <ProductCard key={p.id} product={p} onBuy={(prod) => window.open('https://shopee.vn/search?keyword=' + encodeURIComponent(prod.name), '_blank')} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
