import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, doc, deleteDoc, addDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../firestoreError";
import { Review, Product } from "../types";
import {
  Star,
  Trash2,
  Search,
  Filter,
  Plus,
  Calendar,
  AlertCircle,
  ShoppingBag,
  UserCheck,
  CheckCircle2,
  Award,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  UploadCloud,
  Sparkles,
  Camera,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CLOUD_NAME = "dzcxwyxy3";
const UPLOAD_PRESET = "smarthaatbd";

interface ReviewsSectionProps {
  products: Product[];
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export function ReviewsSection({ products, addToast }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  // States for Image Lightbox Zoom
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxReview, setLightboxReview] = useState<Review | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  // Sample reviews generation & simulation helper states
  const [selectedProductForSample, setSelectedProductForSample] = useState<string>("");
  const [sampleRating, setSampleRating] = useState<number>(5);
  const [sampleComment, setSampleComment] = useState("");
  const [sampleName, setSampleName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Multi-image selection state for custom test uploads
  const [demoFiles, setDemoFiles] = useState<(File | null)[]>([null, null, null]);
  const [demoPreviews, setDemoPreviews] = useState<(string | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to reviews snapshot in real-time
  useEffect(() => {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Review[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            productId: data.productId || "",
            productName: data.productName || "",
            customerName: data.customerName || "",
            rating: Number(data.rating) || 5,
            comment: data.comment || "",
            createdAt: Number(data.createdAt) || Date.now(),
            images: data.images || [],
          });
        });
        setReviews(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "reviews");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Look up product helper to find its thumbnail image by ID
  const productLookup = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Filter and matches
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const pName = r.productName.toLowerCase();
      const cName = r.customerName.toLowerCase();
      const txt = r.comment.toLowerCase();
      const queryLower = searchQuery.toLowerCase();

      const matchSearch =
        cName.includes(queryLower) ||
        pName.includes(queryLower) ||
        txt.includes(queryLower);
      
      const matchRating = ratingFilter === "all" || r.rating === ratingFilter;
      return matchSearch && matchRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  // Review aggregate stats
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { avgRating: 0, total: 0, positivePercent: 0, withImages: 0 };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = Number((sum / total).toFixed(1));
    const positiveCount = reviews.filter((r) => r.rating >= 4).length;
    const positivePercent = Math.round((positiveCount / total) * 100);
    const withImages = reviews.filter((r) => r.images && r.images.length > 0).length;

    return { avgRating, total, positivePercent, withImages };
  }, [reviews]);

  // Handle slot clicking for uploader
  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  // Handle file inputs of selected image
  const handleFeaturedFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith("image/")) {
        const newFiles = [...demoFiles];
        newFiles[activeSlot] = selectedFile;
        setDemoFiles(newFiles);

        const reader = new FileReader();
        reader.onload = (event) => {
          const newPreviews = [...demoPreviews];
          newPreviews[activeSlot] = event.target?.result as string;
          setDemoPreviews(newPreviews);
        };
        reader.readAsDataURL(selectedFile);
        addToast("info", `Image matched to Slot ${activeSlot + 1}`);
      } else {
        addToast("error", "Unsupported image format. Please use JPG, WEBP, or PNG.");
      }
      e.target.value = "";
    }
  };

  // Clear demo image slot
  const clearSlot = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newFiles = [...demoFiles];
    newFiles[index] = null;
    setDemoFiles(newFiles);

    const newPreviews = [...demoPreviews];
    newPreviews[index] = null;
    setDemoPreviews(newPreviews);
  };

  // Clean form
  const resetDemoForm = () => {
    setSampleName("");
    setSampleComment("");
    setSampleRating(5);
    setDemoFiles([null, null, null]);
    setDemoPreviews([null, null, null]);
    setSelectedProductForSample("");
  };

  // Handle submission of a simulation review along with Cloudinary upload
  const handleAddSampleReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductForSample) {
      addToast("error", "Please select a product first!");
      return;
    }
    if (!sampleName.trim()) {
      addToast("error", "Please enter the customer's name!");
      return;
    }
    if (!sampleComment.trim()) {
      addToast("error", "Please write a comment or review feedback!");
      return;
    }

    const matchedProd = productLookup[selectedProductForSample];
    const productName = matchedProd ? matchedProd.name : "Unknown Product";

    try {
      setUploadingImages(true);
      const uploadedUrls: string[] = [];

      // Loop through selected slots and upload them to Cloudinary
      for (let i = 0; i < demoFiles.length; i++) {
        const file = demoFiles[i];
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", UPLOAD_PRESET);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Media upload failed in slot ${i + 1}`);
          }

          const resData = await res.json();
          if (resData.secure_url) {
            uploadedUrls.push(resData.secure_url);
          }
        }
      }

      // Add actual review documentation to firestore
      await addDoc(collection(db, "reviews"), {
        productId: selectedProductForSample,
        productName: productName,
        customerName: sampleName.trim(),
        rating: sampleRating,
        comment: sampleComment.trim(),
        createdAt: Date.now(),
        images: uploadedUrls, // array of Cloudinary photo URLs
      });

      addToast("success", "Review published successfully and added in real-time!");
      resetDemoForm();
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      addToast("error", "Failed to publish review. Check your Cloudinary config or Firebase rules.");
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle Review Delete
  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    try {
      await deleteDoc(doc(db, "reviews", reviewToDelete.id));
      addToast("success", "Review deleted successfully!");
      setReviewToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewToDelete.id}`);
      addToast("error", "Failed to delete review. Check Firestore security rules.");
    }
  };

  // Lighbox control methods
  const zoomIn = () => setLightboxZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.75));
  const resetZoom = () => setLightboxZoom(1);

  return (
    <div className="space-y-6" id="reviews-section-root">
      {/* 1. Header Banner & Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-400 animate-pulse" />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2.5 inline-block">
            Customer Feedback & Moderation
          </span>
          <h2 className="text-xl font-black flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/25 text-indigo-400 border border-indigo-400/30 rounded-xl">
              <Star className="w-5 h-5 fill-indigo-400 text-indigo-400" />
            </span>
            <span>Customer Reviews & Ratings Moderation</span>
          </h2>
          <p className="text-xs text-indigo-200/75 mt-1.5 max-w-xl leading-relaxed">
            All customer ratings, reviews, and uploaded photos are synced in real-time. Use this dashboard to moderate comments, view submitted images, or test system integration.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`relative z-10 flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition duration-200 cursor-pointer shadow-lg active:scale-95 ${
            showAddForm
              ? "bg-rose-600 hover:bg-rose-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? "Close Form" : "Simulate Customer Review"}</span>
        </button>
      </div>

      {/* 2. Form to Add Sample Review for Testing */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm overflow-hidden"
          >
            <form onSubmit={handleAddSampleReview} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Simulate Live Customer Review & Media Upload</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold">Cloudinary Integrated</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Product Dropdown */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Select Product *
                  </label>
                  <select
                    value={selectedProductForSample}
                    onChange={(e) => setSelectedProductForSample(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                    required
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (৳{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name Input */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., John Doe"
                    value={sampleName}
                    onChange={(e) => setSampleName(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                    required
                  />
                </div>

                {/* Rating selection */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Rating Score *
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-205 rounded-xl h-[46px] justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSampleRating(star)}
                        className="cursor-pointer hover:scale-125 transition duration-150"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= sampleRating ? "fill-amber-400 text-amber-500" : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-black text-amber-600 ml-1">({sampleRating}/5)</span>
                  </div>
                </div>
              </div>

              {/* Bengali Description or Comment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Feedback or Comment *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Excellent material and super fast delivery. Highly satisfied with this product!"
                  value={sampleComment}
                  onChange={(e) => setSampleComment(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Image upload slots (Up to 3) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Attach Review Images (Up to 3, optional upload to Cloudinary)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFeaturedFileInput}
                  className="hidden"
                  accept="image/*"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[0, 1, 2].map((idx) => {
                    const isSelected = demoPreviews[idx] !== null;
                    return (
                      <div
                        key={idx}
                        onClick={() => !isSelected && handleSlotClick(idx)}
                        className={`relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition min-h-[120px] ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/10"
                            : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <img
                              src={demoPreviews[idx]!}
                              alt={`Slot ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={(e) => clearSlot(idx, e)}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-650 text-white rounded-full hover:bg-red-500 transition shadow-md cursor-pointer bg-rose-600"
                              title="Delete Image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] font-bold text-emerald-600 mt-1.5">
                              Image Selected - Slot {idx + 1}
                            </span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-[11px] font-bold text-slate-600">
                              Upload Image ({idx + 1})
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">Click to choose file</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetDemoForm}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:bg-slate-350 disabled:cursor-not-allowed shadow-md"
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      <span>Submit Live Review (Cloudinary Sync)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Analytics Highlights Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rating Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-500 border border-amber-100">
            <Star className="w-6 h-6 fill-amber-200 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Average Rating</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">{stats.avgRating}</span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= Math.round(stats.avgRating) ? "fill-amber-400 text-amber-500" : "text-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Positivity Percent */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-500 border border-emerald-100">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Positive Feedback %</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">{stats.positivePercent}%</span>
              <span className="text-xs text-slate-400 font-bold">4★ or higher</span>
            </div>
            <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.positivePercent}%` }} />
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-500 border border-indigo-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Customer Reviews</span>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{stats.total}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-bold flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-indigo-500" />
              <span>Real-time Sync Active</span>
            </p>
          </div>
        </div>

        {/* Reviews with Images */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3.5 bg-sky-50 rounded-2xl text-sky-500 border border-sky-100">
            <Camera className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Reviews with Photos</span>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{stats.withImages}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-bold flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-sky-500" />
              <span>Customer Media Gallery</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4. Filter and search block */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search input field */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews by customer or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition"
          />
        </div>

        {/* Star filters row */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto py-1">
          <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </span>
          <button
            onClick={() => setRatingFilter("all")}
            className={`px-3 py-2 rounded-xl text-[11px] font-extrabold tracking-wider shrink-0 transition ${
              ratingFilter === "all"
                ? "bg-slate-900 text-white border border-slate-900 shadow-sm"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setRatingFilter(rating)}
              className={`px-3 py-2 rounded-xl text-[11px] font-mono font-extrabold tracking-wider shrink-0 transition flex items-center gap-1 ${
                ratingFilter === rating
                  ? "bg-slate-900 text-white border border-slate-900 shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50"
              }`}
            >
              <span>{rating}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 5. Reviews List - Bento Grid Layout */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center flex flex-col items-center justify-center shadow-xs">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-extrabold tracking-widest">LOADING REVIEWS DATABASE...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-350 mx-auto mb-3" />
            <p className="text-sm font-black text-slate-800">No Reviews Found!</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {searchQuery || ratingFilter !== "all"
                ? "Please adjust your search terms or filter constraints and try again."
                : "The reviews database is currently empty. Simulate a review with Cloudinary photos above to begin!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredReviews.map((r) => {
                const prod = productLookup[r.productId];
                const productThumbnail = prod ? prod.image : null;
                const productCategory = prod ? prod.category : "Women’s & Girls’ Fashion";

                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs hover:shadow-xs transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      {/* Customer Heading Block */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/20 flex items-center justify-center text-indigo-700 font-black text-xs shadow-3xs uppercase">
                            {r.customerName.slice(0, 1).toUpperCase() || "?"}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                              <span>{r.customerName}</span>
                              <span className="p-0.5 bg-emerald-550/10 border border-emerald-500/10 rounded-[3px] text-[8px] text-emerald-600 font-extrabold font-mono tracking-tighter">Verified</span>
                            </h4>
                            <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-450 shrink-0" />
                              <span>{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                            </span>
                          </div>
                        </div>

                        {/* Sparkling Rating stars */}
                        <div className="flex items-center gap-0.5 bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-100/60">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 shrink-0 ${
                                star <= r.rating ? "fill-amber-400 text-amber-500" : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Unified Product Name/Thumbnail Row - Extremely Compact */}
                      <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 flex items-center gap-2">
                        {productThumbnail ? (
                          <img
                            src={productThumbnail}
                            alt={r.productName}
                            className="w-8 h-8 object-cover rounded-lg border border-slate-200/50 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-200/85 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] text-slate-450 font-bold uppercase tracking-wider leading-none">
                            {productCategory}
                          </p>
                          <h5 className="text-[10px] font-extrabold text-slate-800 truncate mt-0.5 leading-tight">
                            {r.productName}
                          </h5>
                        </div>
                      </div>

                      {/* Comment text block - Sleek and space saver */}
                      <div className="mt-2 px-1 py-1.5">
                        <p className="text-slate-700 font-medium text-[11px] leading-relaxed whitespace-pre-wrap select-all">
                          {r.comment}
                        </p>
                      </div>

                      {/* Image Thumbnail Row with Lightbox Activation */}
                      {r.images && r.images.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/60">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Camera className="w-3 h-3 text-indigo-500" />
                            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">
                              Customer Photos (Click to Zoom)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {r.images.map((imgUrl, uIdx) => (
                              <div
                                key={uIdx}
                                onClick={() => {
                                  setLightboxImage(imgUrl);
                                  setLightboxReview(r);
                                  setLightboxZoom(1);
                                }}
                                className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-zoom-in group shrink-0"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Review img ${uIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-150"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions wrapper (Trash Moderation) - Slimmer & Tight */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[8px] text-slate-400 font-mono font-medium select-all">ID: {r.id}</span>
                      <button
                        onClick={() => setReviewToDelete(r)}
                        className="flex items-center gap-1 text-[9px] font-extrabold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 hover:border-rose-600 rounded-lg px-2 py-1 transition cursor-pointer select-none"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 6. Delete Confirmation Modal */}
      <AnimatePresence>
        {reviewToDelete && (
          <div className="fixed inset-0 bg-slate-950/45 md:backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-md mx-auto"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3 mb-4">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black text-rose-950 uppercase">Delete Review Confirmation</h3>
              </div>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Are you absolutely sure you want to permanently delete this customer review? This action will immediately remove the record from the database and cannot be undone.
              </p>
              
              <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-3.5 text-[11px] text-slate-700 font-bold space-y-1.5 select-all">
                <p>🙋‍♂️ Customer: <span className="text-slate-900 font-black">{reviewToDelete.customerName}</span></p>
                <p>🛒 Product: <span className="text-slate-900 font-black">{reviewToDelete.productName}</span></p>
                <p className="line-clamp-2">💬 Comment: "{reviewToDelete.comment}"</p>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setReviewToDelete(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Image Lightbox with Zoom Controls (Modal overlay) */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[100] p-4 select-none">
            {/* Topbar of lightbox */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-slate-950 to-transparent p-5 flex items-center justify-between z-50 text-white">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-black text-white">{lightboxReview?.customerName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Product: {lightboxReview?.productName}
                  </p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl px-3 py-1.5">
                <button
                  onClick={zoomIn}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={zoomOut}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-800 mx-1" />
                <button
                  onClick={() => {
                    setLightboxImage(null);
                    setLightboxReview(null);
                  }}
                  className="p-1.5 hover:bg-rose-500 rounded-lg text-slate-350 hover:text-white transition cursor-pointer bg-slate-800"
                  title="Close Lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Interactive Zoom Box */}
            <div className="relative flex-1 flex items-center justify-center w-full max-w-4xl p-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: lightboxZoom }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl relative"
              >
                <img
                  src={lightboxImage}
                  alt="Review high res"
                  className="max-w-full max-h-[70vh] object-contain cursor-grab active:cursor-grabbing rounded-xl pointer-events-auto"
                  style={{ transformOrigin: "center center" }}
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            {/* Live Zoom Sliders metadata info at bottom */}
            <div className="absolute bottom-6 inset-x-0 text-center max-w-xl mx-auto px-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl text-white shadow-2xl backdrop-blur-xs">
                <span className="text-[10px] text-indigo-400 font-extrabold block mb-1">Customer Feedback Text</span>
                <p className="text-xs text-slate-200 leading-normal italic font-medium px-1">
                  "{lightboxReview?.comment}"
                </p>
                <div className="flex items-center justify-center gap-3 mt-3 pt-2.5 border-t border-slate-800 text-[10px] font-bold text-slate-400">
                  <span>Zoom Multiplier: {lightboxZoom.toFixed(2)}x</span>
                  <span>•</span>
                  <span>{lightboxReview?.rating}★ Rated Review</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
