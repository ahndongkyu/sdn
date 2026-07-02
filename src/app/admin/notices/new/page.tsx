import Link from "next/link";
import { X } from "lucide-react";
import { createNotice } from "@/lib/actions/notices";

export default function NewNoticePage() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/notices">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">공지 작성</h1>
      </div>

      <form action={createNotice} className="space-y-4">
        <div>
          <div className="mb-1.5 text-xs text-muted">제목</div>
          <input name="title" required placeholder="공지 제목" className="input" />
        </div>
        <div>
          <div className="mb-1.5 text-xs text-muted">내용</div>
          <textarea name="content" rows={8} placeholder="내용을 입력하세요" className="input resize-none" />
        </div>
        <button className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">공지 등록</button>
      </form>
    </div>
  );
}
