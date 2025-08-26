
import React from 'react';

type RichContent = {
  title?: string;
  highlights?: string[];
  sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
};

type Message = {
  id?: string;
  type: 'user' | 'bot';
  content: string;
  richContent?: RichContent;
  options?: string[];
  attachments?: string[];
};

export default function RichChat({ message, onOption, onImage }: { message: Message; onOption?: (opt: string) => void; onImage?: (file: File, previewUrl: string) => void }) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  function handleOptionClick(opt: string) {
    const lower = opt.toLowerCase();
    if (lower.includes('gửi ảnh') || lower.includes('upload') || lower.includes('ảnh')) {
      // open file selector
      fileRef.current?.click();
      return;
    }
    onOption && onOption(opt);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (onImage) onImage(f, url);
    // reset input so selecting same file twice triggers change
    e.currentTarget.value = '';
  }

  return (
    <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, maxWidth: 640 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{message.richContent?.title || 'Trợ lý nha khoa'}</div>
        {message.richContent?.highlights && (
          <div style={{ marginTop: 8 }}>
            {message.richContent.highlights.map((h, i) => (
              <span key={i} style={{ background: '#fff3cd', color: '#664d03', padding: '4px 8px', borderRadius: 12, marginRight: 6, display: 'inline-block' }}>{h}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{message.content}</div>

      {/* Render image attachments inline */}
      {message.attachments && message.attachments.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {message.attachments.map((a: string, i: number) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={a} alt={`attachment-${i}`} style={{ maxWidth: 240, borderRadius: 6, border: '1px solid #eee' }} />
              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>📷 Đã gửi ảnh: {a.split('/').pop()}</div>
            </div>
          ))}
        </div>
      )}

      {message.richContent?.sections?.map((s, i) => (
        <div key={i} style={{ padding: 8, borderLeft: '3px solid #e6e6e6', marginBottom: 6 }}>
          {s.heading && <div style={{ fontWeight: 600 }}>{s.heading}</div>}
          {s.text && <div style={{ marginTop: 4 }}>{s.text}</div>}
          {s.bullets && (
            <ul style={{ marginTop: 6 }}>
              {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          )}
        </div>
      ))}

      {message.options && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {message.options.map((opt: string, i: number) => (
            <button key={i} onClick={() => handleOptionClick(opt)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}
