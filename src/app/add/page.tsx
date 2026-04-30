"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, Lang, dictionary } from "../../contexts/I18nContext";
import CustomCombobox from "../../components/CustomCombobox";
import CustomDateInput from "../../components/CustomDateInput";
import { useDialog } from "../../components/DialogProvider";
import Icon from "../../components/Icon";
import IsbnBarcodeScanner from "./IsbnBarcodeScanner";
import styles from "./page.module.css";

const CATEGORIES = ["HTML CSS", "Programming", "Design", "WordPress", "Adobe", "Kentei", "Office"];
const LOCATIONS = ["Kantor", "Kelas"];
const CONDITIONS = ["Baru", "Bekas"];
const SIZES = ["A4", "A5", "B5", "B5 変形", "B6", "四六判", "文庫"];

type BookFetchResponse = {
  title: string;
  author: string;
  publisher: string;
  publishDate: string;
  size?: string;
  coverUrl: string;
  existingCopies: number;
  nextCopyNumber: number;
};

type TranslationMap = typeof dictionary.id;

export default function AddBook() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const dialog = useDialog();
  const [isbn, setIsbn] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  
  // Smart Counters base integers
  const [editionInt, setEditionInt] = useState(1);
  const [printingInt, setPrintingInt] = useState(1);
  
  const enSuffix = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
    switch (n % 10) {
        case 1: return n + 'st';
        case 2: return n + 'nd';
        case 3: return n + 'rd';
        default: return n + 'th';
    }
  };

  const formatEdition = (num: number, l: Lang) => {
    if (l === 'ja') return num === 1 ? '初版' : `第${num}版`;
    if (l === 'en') return enSuffix(num);
    return `Ke-${num}`;
  };

  const formatPrinting = (num: number, l: Lang) => {
    if (l === 'ja') return `第${num}刷`;
    if (l === 'en') return enSuffix(num);
    return `Ke-${num}`;
  };

  const formatApiDate = (rawDate: string) => {
    if (!rawDate) return "";
    const digits = rawDate.replace(/[^\d]/g, '');
    if (digits.length === 6) {
        return `${digits.slice(0,4)}/${digits.slice(4,6)}`;
    } else if (digits.length === 8) {
        return `${digits.slice(0,4)}/${digits.slice(4,6)}/${digits.slice(6,8)}`;
    }
    return rawDate; 
  };

  // Form State
  const [bookData, setBookData] = useState({
    title: "", author: "", publisher: "", publishDate: "", size: "", coverUrl: "", existingCopies: 0, nextCopyNumber: 1
  });
  
  // Hooks to sync smart counters back to text data if needed for submission, but we construct it on save.
  
  // Inventory State
  const [category, setCategory] = useState("HTML CSS");
  const [location, setLocation] = useState("Kantor");
  const [condition, setCondition] = useState("Baru");
  const [count, setCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const getTrans = (prefix: string, key: string) => {
    const translatedKey = `${prefix}_${key}` as keyof TranslationMap;
    return dictionary[lang][translatedKey] || key;
  };

  const fetchIsbn = async (targetIsbn = isbn) => {
    const lookupIsbn = targetIsbn.trim();
    if (!lookupIsbn) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/books/fetch?isbn=${encodeURIComponent(lookupIsbn)}`);
      if (!res.ok) throw new Error(lang === 'id' ? "Data buku tidak ditemukan di server global." : "Book data not found on global server.");
      const data = await res.json() as BookFetchResponse;
      setBookData({ ...data, publishDate: formatApiDate(data.publishDate || ""), size: data.size || "" });
      if (data.coverUrl) setPreview(data.coverUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  const handleScannedIsbn = async (scannedIsbn: string) => {
    setIsScannerOpen(false);
    setIsbn(scannedIsbn);
    await fetchIsbn(scannedIsbn);
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; // Optimal for UI dashboard rendering
          let width = img.width;
          let height = img.height;

          // Scale only if wider than 400px
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No Canvas Context');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) return reject('Canvas is empty');
            const newFile = new File([blob], "compressed.webp", {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(newFile);
          }, "image/webp", 0.8); // 80% WebP Quality
        };
        img.onerror = () => reject(new Error("Image load failed"));
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      // Tampilkan langsung di layar untuk respon cepat
      setPreview(URL.createObjectURL(rawFile)); 
      
      try {
        const compressed = await compressImage(rawFile);
        setFile(compressed);
        console.log(`Original: ${(rawFile.size / 1024).toFixed(2)} KB, Compressed: ${(compressed.size / 1024).toFixed(2)} KB`);
      } catch (error) {
        console.error("Image compression failed, using original", error);
        setFile(rawFile);
      }
    }
  };

  const saveBook = async () => {
    setSaving(true);
    try {
      let finalCover = bookData.coverUrl;
      
      // If a file was manually uploaded, upload it first
      if (file) {
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) throw new Error("Failed to upload cover image.");
        const uploadData = await uploadRes.json();
        finalCover = uploadData.url;
      }

      // Format edition and printing
      const finalEdition = formatEdition(editionInt, lang);
      const finalPrinting = formatPrinting(printingInt, lang);

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn,
          title: bookData.title,
          author: bookData.author,
          publisher: bookData.publisher,
          publishDate: bookData.publishDate,
          coverUrl: finalCover,
          edition: finalEdition,
          printing: finalPrinting,
          size: bookData.size,
          category,
          location,
          condition,
          count
        })
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error);
      }
      await dialog.alert(lang === 'id' ? `Berhasil menyimpan ${count} buku!` : `Successfully saved ${count} books!`);
      router.push("/");
    } catch(error) {
      await dialog.alert("Error: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className="page-title">{t('addNewBook')}</h1>
      </div>

      <div className={`glass-panel ${styles.isbnPanel}`}>
        <div className={styles.isbnInputWrap}>
          <label className="form-label">{t("isbnNumber")}</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. 978-4-297-10302-6" 
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchIsbn()}
          />
        </div>
        <div className={styles.isbnActions}>
          <button className="btn btn-primary" onClick={() => fetchIsbn()} disabled={loading}>
            {loading ? t('fetching') : t('fetchBtn')}
          </button>
          <button
            type="button"
            className={`btn ${styles.scanButton}`}
            onClick={() => setIsScannerOpen(true)}
            disabled={loading}
          >
            <Icon name="qr_code_scanner" />
            {t("scanIsbn")}
          </button>
        </div>
      </div>

      {isScannerOpen ? (
        <IsbnBarcodeScanner
          onDetected={handleScannedIsbn}
          onClose={() => setIsScannerOpen(false)}
        />
      ) : null}

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.mainGrid}>
        <div className={`glass-panel ${styles.bookInfoPanel}`}>
          <h2 className={styles.sectionTitle}>{t('bookInfo')}</h2>
          
          <div className="form-group">
            <label className="form-label">{t('title')}</label>
            <input type="text" className="form-input" value={bookData.title} onChange={e => setBookData({...bookData, title: e.target.value})} />
          </div>

          <div className={styles.twoColumnGrid}>
            <div className="form-group">
              <label className="form-label">{t('author')}</label>
              <input type="text" className="form-input" value={bookData.author} onChange={e => setBookData({...bookData, author: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('publisher')}</label>
              <input type="text" className="form-input" value={bookData.publisher} onChange={e => setBookData({...bookData, publisher: e.target.value})} />
            </div>
            <div className={`form-group ${styles.relativeGroup}`}>
              <label className="form-label">{t('pubDate')}</label>
              <CustomDateInput
                value={bookData.publishDate}
                displayValue={bookData.publishDate}
                placeholder="e.g. 2012/03/08"
                ariaLabel={t("pubDate")}
                buttonClassName="form-input"
                onChange={(value) =>
                  setBookData({
                    ...bookData,
                    publishDate: value.replace(/-/g, "/"),
                  })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('size')}</label>
              <CustomCombobox
                value={bookData.size}
                options={SIZES}
                inputClassName="form-input"
                placeholder="e.g. B5"
                ariaLabel={t("size")}
                onChange={(value) => setBookData({ ...bookData, size: value })}
              />
            </div>
          </div>
          
          {/* Smart Counters for Edition / Printing */}
          <div className={styles.counterGrid}>
            <div>
              <label className="form-label">{t('edition')}</label>
              <div className={styles.counterControl}>
                <button className={`btn ${styles.counterButton}`} onClick={() => setEditionInt(e => Math.max(1, e - 1))}>-</button>
                <div className={styles.counterValue}>
                    {formatEdition(editionInt, lang)}
                </div>
                <button className={`btn ${styles.counterButton}`} onClick={() => setEditionInt(e => e + 1)}>+</button>
              </div>
            </div>
            <div>
              <label className="form-label">{t('printing')}</label>
              <div className={styles.counterControl}>
                <button className={`btn ${styles.counterButton}`} onClick={() => setPrintingInt(e => Math.max(1, e - 1))}>-</button>
                <div className={styles.counterValue}>
                    {formatPrinting(printingInt, lang)}
                </div>
                <button className={`btn ${styles.counterButton}`} onClick={() => setPrintingInt(e => e + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        <div className={`glass-panel ${styles.coverPanel}`}>
          <label className={`form-label ${styles.coverLabel}`}>{t('coverImage')}</label>
          {preview ? (
            <div className={styles.coverPreview}>
              <Image src={preview} alt="Cover Preview" fill unoptimized className={styles.coverImage} />
            </div>
          ) : (
            <div className={styles.noCoverPreview}>
              {t('noCover')}
            </div>
          )}
          
          <label className={styles.uploadLabel}>
            <input type="file" accept="image/*" onChange={handleFileChange} className={styles.fileInput} />
            <div className={`btn ${styles.uploadButton}`}>
              <Icon name="upload" />
              {" "}
              {t('uploadBtn')}
            </div>
          </label>
        </div>
      </div>

      <div className={`glass-panel ${styles.skuPanel}`}>
        <h2 className={styles.sectionTitle}>{t('detailsSKU')}</h2>
        
        {bookData.existingCopies > 0 && (
            <div className={styles.existingNotice}>
                <span className={styles.noticeIcon}><Icon name="info" /></span>
                {lang === 'id' ? `Buku ini sudah tersimpan sebanyak ${bookData.existingCopies} eksemplar di database. Eksemplar berikutnya otomatis mendapat akhiran -${bookData.nextCopyNumber}.` : `This book already has ${bookData.existingCopies} physical copies. The next copy will automatically be assigned suffix -${bookData.nextCopyNumber}.`}
            </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('category')}</label>
          <div className={styles.tagContainer}>
            {CATEGORIES.map(c => (
               <div key={c} className={`tag ${category === c ? 'selected' : ''}`} onClick={() => setCategory(c)}>{c}</div>
            ))}
          </div>
        </div>

        <div className={`form-group ${styles.spacedGroup}`}>
          <label className="form-label">{t('location')}</label>
          <div className={styles.tagContainer}>
            {LOCATIONS.map(l => (
               <div key={l} className={`tag ${location === l ? 'selected' : ''}`} onClick={() => setLocation(l)}>{getTrans('loc', l)}</div>
            ))}
          </div>
        </div>

        <div className={`form-group ${styles.spacedGroup}`}>
          <label className="form-label">{t('condition')}</label>
          <div className={styles.tagContainer}>
            {CONDITIONS.map(c => (
               <div key={c} className={`tag ${condition === c ? 'selected' : ''}`} onClick={() => setCondition(c)}>{getTrans('cond', c)}</div>
            ))}
          </div>
        </div>

        <div className={`form-group ${styles.copyCountGroup}`}>
          <label className="form-label">{t('copyCountText')}</label>
          <input type="number" min="1" max="50" className="form-input" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} />
        </div>

        <button className={`btn btn-primary ${styles.saveButton}`} onClick={saveBook} disabled={saving || !bookData.title || uploading}>
          {saving || uploading ? (uploading ? "Uploading Image..." : t('saving')) : t('saveBtn')}
        </button>

      </div>
    </div>
  );
}
