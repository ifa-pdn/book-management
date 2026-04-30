import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { dictionary, Lang } from "../../../../lib/translations";
import { requireAdmin } from "../../../../lib/auth";

type TranslationMap = typeof dictionary.id;

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const langParam = searchParams.get('lang') || 'id';
    
    // Ensure lang is valid
    const lang: Lang = (['id', 'en', 'ja'].includes(langParam) ? langParam : 'id') as Lang;
    const t = dictionary[lang] || dictionary.id;

    const getTrans = (prefix: string, key: string) => {
        const translatedKey = `${prefix}_${key}` as keyof TranslationMap;
        return t[translatedKey] || key;
    };

    const enSuffix = (n: number) => {
        if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
        switch (n % 10) {
            case 1: return n + 'st';
            case 2: return n + 'nd';
            case 3: return n + 'rd';
            default: return n + 'th';
        }
    };

    const formatDynamic = (text: string, type: 'edition' | 'printing', l: string) => {
        if (!text || text === '-') return '-';
        let num = parseInt(text.replace(/[^\d]/g, ''));
        if (isNaN(num)) {
            if (text.includes('初') || text.includes('1st') || text.toLowerCase().includes('pertama')) num = 1;
            else num = 1;
        }

        if (type === 'edition') {
            if (l === 'ja') return num === 1 ? '初版' : `第${num}版`;
            if (l === 'en') return enSuffix(num);
            return `Ke-${num}`;
        } else {
            if (l === 'ja') return `第${num}刷`;
            if (l === 'en') return enSuffix(num);
            return `Ke-${num}`;
        }
    };

    const books = await prisma.book.findMany({
      include: {
        copies: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // CSV Headers translated according to lang
    const headers = [
      "ISBN", 
      t.title || "Title", 
      t.author || "Author", 
      t.publisher || "Publisher", 
      t.edition || "Edition", 
      t.printing || "Printing", 
      t.pubDate || "Publish Date", 
      t.size || "Size", 
      t.category || "Category", 
      "UniqueCode", 
      t.location || "Location", 
      t.condition || "Condition"
    ];

    const rows = [];
    rows.push(headers.join(","));

    for (const book of books) {
      const baseRow = [
        `"${book.isbn}"`,
        `"${(book.title || "").replace(/"/g, '""')}"`,
        `"${(book.author || "").replace(/"/g, '""')}"`,
        `"${(book.publisher || "").replace(/"/g, '""')}"`,
        `"${formatDynamic(book.edition || "", 'edition', lang)}"`,
        `"${formatDynamic(book.printing || "", 'printing', lang)}"`,
        `"${(book.publishDate || "").replace(/"/g, '""')}"`,
        `"${(book.size || "").replace(/"/g, '""')}"`,
        `"${(book.category || "").replace(/"/g, '""')}"`
      ];

      if (book.copies.length === 0) {
          const row = [...baseRow, `"-"`, `"-"`, `"-"` ];
          rows.push(row.join(","));
          continue;
      }
      
      for (const copy of book.copies) {
        const row = [
          ...baseRow,
          `"${copy.uniqueCode}"`,
          `"${getTrans('loc', copy.location || "")}"`,
          `"${getTrans('cond', copy.condition || "")}"`
        ];
        rows.push(row.join(","));
      }
    }

    const csvContent = "\uFEFF" + rows.join("\n"); 
    
    // Custom filename format: YYYYMMDDHHmm_books_auc.csv
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `${timestamp}_books_auc.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error("Export error", error);
    // Explicitly return the error message for debugging
    return NextResponse.json({ error: "Failed to export CSV", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
