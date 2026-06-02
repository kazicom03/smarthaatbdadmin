import React, { useState, useRef } from "react";
import { PlusCircle, Image, Trash2, Package, UploadCloud, Coins, Files, X, Check, Edit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Product } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreError";
import { EditProductModal } from "./EditProductModal";

interface ProductSectionProps {
  products: Product[];
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

const InnerProductCard: React.FC<{
  p: Product;
  index: number;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  handleDeleteProduct: (id: string, name: string) => void;
  onEdit: () => void;
}> = ({ p, index, deletingId, setDeletingId, handleDeleteProduct, onEdit }) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const images = p.images && p.images.length > 0 ? p.images : [p.image].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all group"
    >
      <div className="space-y-3">
        <div className="aspect-square relative overflow-hidden bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center">
          <img
            src={images[activeImgIdx] || p.image}
            alt={p.name}
            referrerPolicy="no-referrer"
            className="max-h-24 object-contain transition-transform group-hover:scale-105 duration-300"
          />
          <span className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full font-mono z-10">
            ৳{p.price.toLocaleString()}
          </span>

          {/* Category Badge */}
          <span className="absolute top-2.5 left-2.5 bg-emerald-500/90 backdrop-blur-xs text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full z-10">
            {p.category || "Others"}
          </span>

          {/* Mini thumbnails inside the hover area */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-slate-200/50 z-10">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveImgIdx(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                    activeImgIdx === i ? "bg-emerald-500 scale-125" : "bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition">
            {p.name}
          </h4>
          <p className="text-[11px] text-slate-400 line-clamp-2 h-8 leading-normal">
            {p.description || "N/A"}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[9px] text-slate-400 font-mono">
          Ref: {p.id.slice(0, 8)}...
        </span>
        {deletingId === p.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                handleDeleteProduct(p.id, p.name);
                setDeletingId(null);
              }}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded px-2 py-0.5 text-[9px] font-bold transition cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[9px] font-bold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-emerald-50 text-emerald-500 hover:text-emerald-600 rounded-lg transition cursor-pointer"
              title="Edit Product"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeletingId(p.id)}
              className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const ProductSection: React.FC<ProductSectionProps> = ({ products, addToast }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Women’s & Girls’ Fashion");
  
  // Multi image states for up to 3 slots
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [dragActiveSlot, setDragActiveSlot] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file input for a slot
  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  // Drag and drop handlers for specific slots
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
        const newFiles = [...files];
        newFiles[index] = droppedFile;
        setFiles(newFiles);

        const reader = new FileReader();
        reader.onload = (event) => {
          const newPreviews = [...imagePreviews];
          newPreviews[index] = event.target?.result as string;
          setImagePreviews(newPreviews);
        };
        reader.readAsDataURL(droppedFile);
        addToast("success", `Image dropped into Slot ${index + 1}!`);
      } else {
        addToast("error", "Unsupported file. Please upload an image format (PNG, JPG, WEBP).");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith("image/")) {
        const newFiles = [...files];
        newFiles[activeSlot] = selectedFile;
        setFiles(newFiles);

        const reader = new FileReader();
        reader.onload = (event) => {
          const newPreviews = [...imagePreviews];
          newPreviews[activeSlot] = event.target?.result as string;
          setImagePreviews(newPreviews);
        };
        reader.readAsDataURL(selectedFile);
        addToast("success", `Image added to Slot ${activeSlot + 1}!`);
      } else {
        addToast("error", "Unsupported file. Please select an image.");
      }
      e.target.value = "";
    }
  };

  const clearSlot = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newFiles = [...files];
    newFiles[index] = null;
    setFiles(newFiles);

    const newPreviews = [...imagePreviews];
    newPreviews[index] = null;
    setImagePreviews(newPreviews);
  };

  const clearAllSlots = () => {
    setFiles([null, null, null]);
    setImagePreviews([null, null, null]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return addToast("error", "Please input the product name");
    if (!price || Number(price) <= 0) return addToast("error", "Please enter a valid product price");
    
    // First slot (Primary Image) is required
    if (!files[0]) return addToast("error", "Please upload the primary product image (Slot 1)");

    try {
      setUploading(true);
      addToast("info", "Uploading images to media cloud storage...");
      
      const urls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const fileToUpload = files[i];
        if (fileToUpload) {
          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("upload_preset", UPLOAD_PRESET);
          
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Could not upload image in slot ${i + 1}`);
          }

          const data = await res.json();
          urls.push(data.secure_url);
        }
      }

      if (urls.length === 0) return addToast("error", "No images uploaded.");

      addToast("info", "Adding record to database store...");

      await addDoc(collection(db, "products"), {
        name: name.trim(),
        price: Number(price),
        description: desc.trim(),
        category: category,
        image: urls[0], // Main fallback image
        images: urls,   // Up to 3 gallery images
        time: Date.now(),
      });

      addToast("success", `"${name}" listed successfully with ${urls.length} images! 🚀`);
      
      // Reset inputs
      setName("");
      setPrice("");
      setDesc("");
      setCategory("Women’s & Girls’ Fashion");
      clearAllSlots();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "products");
      addToast("error", "Failed to list item. Check configurations and retry.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      addToast("success", `Deleted "${prodName}" from shop inventory.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      addToast("error", "Failed to delete product. Please retry.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      
      {/* ADD COMPONENT SECTION (Left column/span-2) */}
      <div className="lg:col-span-2 space-y-6">
        <div id="productSection" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Add New Product</h2>
              <p className="text-[11px] text-slate-400">Add active items to customer shop screen</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Product Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Smart Watch Series 8"
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Selling Price (BDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">৳</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="2499"
                  className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Ad Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm outline-none transition bg-white"
              >
                {CATEGORIES.map((catOpt) => (
                  <option key={catOpt} value={catOpt}>
                    {catOpt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Short Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Product specifications, warranty details, and colors..."
                rows={3}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm outline-none transition resize-none"
              />
            </div>

            {/* MULTI IMAGE DRAG AND DROP SLOTS (UP TO 3 IMAGES) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center justify-between">
                <span>Product Showcase Images (Max 3)</span>
                <span className="text-[10px] text-slate-400 font-normal">Slot 1 is primary</span>
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slotIdx) => {
                  const preview = imagePreviews[slotIdx];
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
                          : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {!preview ? (
                          <motion.div
                            key="prompt"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center text-slate-400"
                          >
                            <UploadCloud className="w-4 h-4 mb-1" />
                            <span className="text-[9px] font-bold">Slot {slotIdx + 1}</span>
                            <span className="text-[8px] opacity-75 font-normal">
                              {slotIdx === 0 ? "Primary" : "Optional"}
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              src={preview}
                              alt={`Slot ${slotIdx + 1}`}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full rounded object-contain bg-white p-0.5 border"
                            />
                            <button
                              type="button"
                              onClick={(e) => clearSlot(slotIdx, e)}
                              className="absolute -top-1 -right-1 p-0.5 bg-rose-50 text-rose-500 rounded-full border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition shadow z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
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

            <button
              type="submit"
              disabled={uploading}
              className={`w-full py-3 rounded-xl text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer ${
                uploading 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-emerald-500 hover:bg-emerald-600 active:scale-98"
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing with Cloud...
                </>
              ) : (
                <>Upload Product live</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* PRODUCTS DISPLAY GRID VIEW (Right column/span-3) - CRITICAL VALUE ADD */}
      <div className="lg:col-span-3 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
          Active Live Products ({products.length})
        </h3>

        {products.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl text-center py-14 p-6">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-600">No Showcase Products</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Add products in the form on the left to see them listed instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {products.map((p, index) => (
                <InnerProductCard
                  key={p.id}
                  p={p}
                  index={index}
                  deletingId={deletingId}
                  setDeletingId={setDeletingId}
                  handleDeleteProduct={handleDeleteProduct}
                  onEdit={() => setEditingProduct(p)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
      
    </div>
  );
};
