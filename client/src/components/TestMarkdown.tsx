import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TestMarkdown() {
  const text = `
1. **Phân tích triệu chứng:** Răng sữa bị sâu.
2. **Tư vấn sơ bộ:** Nên đi khám sớm.
- Cho trẻ đánh răng 2 lần/ngày.
`;

  return (
    <div className="p-6 prose prose-sm max-w-none text-gray-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
