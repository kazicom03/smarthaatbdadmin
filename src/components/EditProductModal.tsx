import React, { useState, useRef, useEffect } from "react";
import { X, UploadCloud, Save, Loader2, Check, Edit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Product } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreError";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

const CLOUD_NAME = "dzcxwyxy3";
const UPLOAD_PRESET = "smarthaatbd";

const CATEGORIES = [
  "Women’s & Girls’ Fashion",
  "Men’s & Boys’ Fashion",
  "Electronic Accessories",
  "TV & Home Appliances",
  "Electronics Devices",
  "Mother & Baby",
  "Automotive & Motorbike",
  "Sports & Outdoors",
  "Home & Lifestyle",
  "Groceries",
  "Health & Beauty",
  "Watches, Bags & Jewellery",
  "Pet Care",
  "Books & Stationery",
  "Kitchen & Dining",
  "Furniture",
  "Toys & Games",
  "Mobile & Gadgets",
  "Tools & Hardware",
  "Gift & Seasonal Items",
];

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, addToast }) => {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [desc, setDesc] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "Women’s & Girls’ Fashion");

  // Represent image slots. Each can be:
  // - a string (existing Cloudinary URL)
  // - a File (newly selected local file)
  // - null (empty or deleted)
  const [imageSlots, setImageSlots] = useState<(string | File | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [dragActiveSlot, setDragActiveSlot] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize slots with existing product images
  useEffect(() => {
    const existingImages = product.images && product.images.length > 0 
      ? product.images 
      : [product.image].filter(Boolean);

    const initialSlots: (string | File | null)[] = [null, null, null];
    for (let i = 0; i < 3; i++) {
      if (existingImages[i]) {
        initialSlots[i] = existingImages[i];
      }
    }
    setImageSlots(initialSlots);
  }, [product]);

  // Convert Bangla numbers to English digits for safety & consistency
  const keepAndConvertEnglishDigits = (value: string): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    let cleanValue = "";
    let hasDecimal = false;
    for (let char of value) {
      const idx = banglaDigits.indexOf(char);
      if (idx !== -1) {
        cleanValue += idx;
      } else if (char >= "0" && char <= "9") {
        cleanValue += char;
      } else if (char === "." && !hasDecimal) {
        cleanValue += char;
        hasDecimal = true;
      }
    }
    return cleanValue;
  };

  const handlePriceChange = (val: string) => {
    setPrice(keepAndConvertEnglishDigits(val));
  };

  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  const handleDragOverSlot = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveSlot(index);
  };

  const handleDragLeaveSlot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveSlot(null);
  };

  const handleDropOnSlot = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveSlot(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        const newSlots = [...imageSlots];
        newSlots[index] = droppedFile;
        setImageSlots(newSlots);
        addToast("success", `New image dropped into Slot ${index + 1}!`);
      } else {
        addToast("error", "Unsupported file. Please upload an image format.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith("image/")) {
        const newSlots = [...imageSlots];
        newSlots[activeSlot] = selectedFile;
        setImageSlots(newSlots);
        addToast("success", `New image added to Slot ${activeSlot + 1}!`);
      } else {
        addToast("error", "Unsupported file. Please select an image.");
      }
    }
    e.target.value = "";
  };

  const clearSlot = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newSlots = [...imageSlots];
    newSlots[index] = null;
    setImageSlots(newSlots);
  };

  const getPreviewUrl = (slot: string | File | null): string => {
    if (!slot) return "";
    if (typeof slot === "string") return slot;
    return URL.createObjectURL(slot);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return addToast("error", "Product name cannot be empty");
    if (!price || Number(price) <= 0) return addToast("error", "Please input a valid price");

    // Must have at least a primary image
    if (!imageSlots[0]) {
      return addToast("error", "Please provide a primary image in Slot 1");
    }

    try {
      setUploading(true);
      addToast("info", "Syncing product updates with database...");

      const updatedUrls: string[] = [];

      // Loop through slots and process each
      for (let i = 0; i < imageSlots.length; i++) {
        const slot = imageSlots[i];
        if (!slot) continue;

        if (typeof slot === "string") {
          // This is an existing Cloudinary URL, reuse it
          updatedUrls.push(slot);
        } else {
          // This is a new File, upload to Cloudinary
          const formData = new FormData();
          formData.append("file", slot);
          formData.append("upload_preset", UPLOAD_PRESET);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Failed to upload slot ${i + 1} image`);
          }

          const data = await res.json();
          updatedUrls.push(data.secure_url);
        }
      }

      if (updatedUrls.length === 0) {
        return addToast("error", "Product must contain at least one valid image");
      }

      // Update in Firestore
      await updateDoc(doc(db, "products", product.id), {
        name: name.trim(),
        price: Number(price),
        description: desc.trim(),
        category: category,
        image: updatedUrls[0], // Main fallback image
        images: updatedUrls,   // Dynamic gallery images
      });

      addToast("success", `"${name}" updated successfully! 🚀`);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
      addToast("error", "Could not save modifications. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      {/* Backdrop hit trigger */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 z-10 max-h-[92vh] flex flex-col text-left"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50">
              <Edit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Edit Showcase Product</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Modify information listed on the server live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSaveChanges} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title / Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product title"
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs outline-none transition bg-white"
              />
            </div>

            {/* Selling Price */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selling Price (BDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">৳</span>
                <input
                  type="text"
                  required
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="Selling price"
                  className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-xs outline-none transition bg-white font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs outline-none transition bg-white"
              >
                {CATEGORIES.map((catOpt) => (
                  <option key={catOpt} value={catOpt}>
                    {catOpt}
                  </option>
                ))}
              </select>
            </div>

            {/* Ad Reference metadata */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product ID Reference</label>
              <input
                type="text"
                disabled
                value={product.id}
                className="w-full border border-slate-100 bg-slate-50/80 rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-400 cursor-not-allowed font-mono select-all"
              />
            </div>
          </div>

          {/* Description details */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Detailed product specification or details..."
              rows={3}
              className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs outline-none transition resize-none bg-white leading-relaxed"
            />
          </div>

          {/* Images Grid Showcase */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Showcase Images (Max 3)</span>
              <span className="text-[9px] text-slate-450 font-normal">Slot 1 is the main thumbnail</span>
            </label>

            <div className="grid grid-cols-3 gap-3.5">
              {[0, 1, 2].map((slotIdx) => {
                const slotContent = imageSlots[slotIdx];
                const preview = getPreviewUrl(slotContent);
                const isDragActive = dragActiveSlot === slotIdx;

                return (
                  <div
                    key={slotIdx}
                    onDragEnter={(e) => handleDragOverSlot(e, slotIdx)}
                    onDragOver={(e) => handleDragOverSlot(e, slotIdx)}
                    onDragLeave={handleDragLeaveSlot}
                    onDrop={(e) => handleDropOnSlot(e, slotIdx)}
                    onClick={() => handleSlotClick(slotIdx)}
                    className={`relative border-2 border-dashed rounded-xl p-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center aspect-square ${
                      isDragActive
                        ? "border-emerald-500 bg-emerald-50/45 scale-102 shadow-sm"
                        : preview
                        ? "border-slate-200 bg-slate-50/20"
                        : "border-slate-300 bg-slate-50/55 hover:bg-slate-50"
                    }`}
                  >
                    {!preview ? (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <UploadCloud className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Slot {slotIdx + 1}</span>
                        <span className="text-[8px] opacity-75 font-normal">
                          {slotIdx === 0 ? "Primary" : "Optional"}
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img
                          src={preview}
                          alt={`Slot ${slotIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full rounded object-contain bg-white p-0.5 border shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={(e) => clearSlot(slotIdx, e)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-50 text-rose-500 rounded-full border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition shadow-xs z-10"
                        >
                          <X className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Action buttons footer inside modal */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className={`px-5 py-2.5 rounded-xl text-white text-[11px] font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                uploading
                  ? "bg-slate-400 cursor-not-allowed text-slate-200"
                  : "bg-emerald-500 hover:bg-emerald-600 active:scale-98"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating Cloud...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Modifications
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
