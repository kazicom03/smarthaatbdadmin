import React, { useState, useMemo } from "react";
import { Trash2, Search, Package, PlusCircle, DollarSign, Tag, Clock, X, Calendar, ImageIcon, Edit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Product } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreError";
import { EditProductModal } from "./EditProductModal";

interface ManageProductsProps {
  products: Product[];
  addToast: (type: "success" | "error" | "info", text: string) => void;
  onNavigateToAdd: () => void;
}

const CATEGORIES = [
  "All",
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

const ManageProductCard: React.FC<{
  p: Product;
  index: number;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  handleDeleteProduct: (id: string, name: string) => void;
  onViewDetail: () => void;
  onEdit: () => void;
}> = ({ p, index, deletingId, setDeletingId, handleDeleteProduct, onViewDetail, onEdit }) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const images = p.images && p.images.length > 0 ? p.images : [p.image].filter(Boolean);

  const formattedDate = new Date(p.time).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group relative shadow-xs"
    >
      {/* Clickable Image & Content Block (Triggers Detail modal) */}
      <div onClick={onViewDetail} className="p-4 space-y-4 cursor-pointer flex-1">
        <div className="aspect-video relative overflow-hidden bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-center">
          <img
            src={images[activeImgIdx] || p.image}
            alt={p.name}
            referrerPolicy="no-referrer"
            className="max-h-24 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-white text-[10px] font-black px-2.5 py-1 rounded-lg font-sans z-10 shadow-xs">
            ৳{p.price.toLocaleString()}
          </div>

          {/* Category Badge */}
          <span className="absolute top-2.5 left-2.5 bg-emerald-500/90 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md z-10">
            {p.category || "Others"}
          </span>

          {/* Mini thumbnails indicator dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs border border-slate-200/50 z-10">
              {images.map((_, i) => (
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

        {/* Metadata */}
        <div className="space-y-1.5 text-left">
          <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-500 transition">
            {p.name}
          </h4>
          <p className="text-[11px] text-slate-400 h-10 overflow-hidden leading-relaxed text-ellipsis line-clamp-2">
            {p.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Actions footer component */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{formattedDate}</span>
        </div>

        {deletingId === p.id ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProduct(p.id, p.name);
                setDeletingId(null);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] py-1 px-2 rounded transition-all cursor-pointer shadow-sm"
            >
              Confirm
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(null);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[10px] py-1 px-2 rounded transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-50 hover:border-emerald-100 font-extrabold text-[10px] py-1 px-2 rounded transition-all flex items-center gap-1 cursor-pointer"
              title="Edit Product"
            >
              <Edit className="w-3 h-3 shrink-0" />
              Edit Ad
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(p.id);
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-50 hover:border-red-100 font-extrabold text-[10px] py-1 px-2.5 rounded transition-all flex items-center gap-1 cursor-pointer"
              title="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              Delete Ad
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const ManageProducts: React.FC<ManageProductsProps> = ({ products, addToast, onNavigateToAdd }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal / details viewer state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailActiveImgIdx, setDetailActiveImgIdx] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Handle delete action
  const handleDeleteProduct = async (id: string, prodName: string) => {
    try {
      addToast("info", `Deleting "${prodName}"...`);
      await deleteDoc(doc(db, "products", id));
      addToast("success", `"${prodName}" deleted successfully!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      addToast("error", "Error occurred while deleting. Please try again.");
    }
  };

  // Filter products by search term & category filter
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Analytics for dynamic info blocks
  const productStats = useMemo(() => {
    const count = products.length;
    const totalValuation = products.reduce((acc, p) => acc + p.price, 0);
    const avgPrice = count > 0 ? Math.round(totalValuation / count) : 0;
    return { count, totalValuation, avgPrice };
  }, [products]);

  // Custom function to open details modal
  const openDetails = (product: Product) => {
    setDetailProduct(product);
    setDetailActiveImgIdx(0);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP STATS AND ACTIONS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Ads Block */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Active Ads</span>
            <span className="text-xl font-black text-slate-800 font-mono">{productStats.count} Items</span>
          </div>
        </div>

        {/* Total Price valuation */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/50">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Inventory Value</span>
            <span className="text-xl font-black text-slate-800 font-mono">৳{productStats.totalValuation.toLocaleString()}</span>
          </div>
        </div>

        {/* Avg Price */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/50">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average Price</span>
            <span className="text-xl font-black text-slate-800 font-mono">৳{productStats.avgPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & NAVIGATION HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-2xs">
        {/* Search Input wrapper */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ads by name or keywords..."
            className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition"
          />
        </div>

        {/* Quick List triggers */}
        <button
          onClick={onNavigateToAdd}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Upload New Ad
        </button>
      </div>

      {/* 3. CATEGORIES HORIZONTAL NAVIGATION PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((catKey) => {
          const isActive = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {catKey === "All" ? "⭐ All Categories" : catKey}
            </button>
          );
        })}
      </div>

      {/* 4. PRODUCTS DISPLAY CONTAINER */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl text-center py-20 p-8 shadow-2xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">No Ads Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {searchTerm || selectedCategory !== "All"
              ? "There are no products matching your search criteria or selected category filter."
              : "There are currently no active ads listed. Click the button above to upload a new advertisement."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProducts.map((p, index) => (
              <ManageProductCard
                key={p.id}
                p={p}
                index={index}
                deletingId={deletingId}
                setDeletingId={setDeletingId}
                handleDeleteProduct={handleDeleteProduct}
                onViewDetail={() => openDetails(p)}
                onEdit={() => setEditingProduct(p)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 5. INTERACTIVE AD DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {detailProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            {/* Modal backdrop closer hit block */}
            <div
              className="absolute inset-0 cursor-default"
              onClick={() => setDetailProduct(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 z-10 max-h-[90vh] flex flex-col text-left"
            >
              {/* Modal header with product name & close */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="inline-block bg-slate-100 text-slate-600 font-extrabold text-[9px] px-2.5 py-1 rounded mb-1 uppercase tracking-wider font-mono">
                    Product Specifications
                  </span>
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1">
                    {detailProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal scrollable body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Image Showcase segment */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center relative">
                  
                  {/* Big primary focus frame */}
                  <div className="h-56 w-full flex items-center justify-center p-4 overflow-hidden">
                    <img
                      src={
                        (detailProduct.images && detailProduct.images[detailActiveImgIdx]) ||
                        detailProduct.image
                      }
                      alt={detailProduct.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                    />
                  </div>

                  {/* Thumbnail slider blocks */}
                  {detailProduct.images && detailProduct.images.length > 1 && (
                    <div className="flex items-center gap-2 mt-4">
                      {detailProduct.images.map((imgUrl, thumbIdx) => {
                        const isFocus = detailActiveImgIdx === thumbIdx;
                        return (
                          <button
                            key={thumbIdx}
                            onClick={() => setDetailActiveImgIdx(thumbIdx)}
                            className={`w-14 h-14 bg-white border rounded-xl overflow-hidden p-1 flex items-center justify-center transition-all cursor-pointer ${
                              isFocus
                                ? "border-emerald-500 ring-2 ring-emerald-500/10 scale-102"
                                : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt="Thumbnail"
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Info blocks: Price and Categories */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Price (BDT)</span>
                    <span className="text-lg font-black text-slate-800">৳{detailProduct.price.toLocaleString()}</span>
                  </div>

                  {/* Category */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">Category</span>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg inline-block">
                      {detailProduct.category || "Others"}
                    </span>
                  </div>
                </div>

                {/* Description details block */}
                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Description</h4>
                  <div className="bg-slate-55/40 border border-slate-100 rounded-2xl p-4">
                    <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-wrap">
                      {detailProduct.description || "No item specifications have been specified for this advertisement."}
                    </p>
                  </div>
                </div>

                {/* Calendar metadata stats section info */}
                <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-100 gap-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Published Date: <b>{new Date(detailProduct.time).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b></span>
                  </span>
                  <span className="font-mono text-slate-300">ID: {detailProduct.id}</span>
                </div>
              </div>

              {/* Close Button Footer Section */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(detailProduct);
                    setDetailProduct(null);
                  }}
                  className="bg-emerald-55 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 hover:border-emerald-200 font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  Edit Ad Details
                </button>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="bg-slate-900 text-white font-extrabold text-xs py-2 px-5 rounded-xl transition hover:bg-slate-800 cursor-pointer"
                >
                  Close Specification
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
