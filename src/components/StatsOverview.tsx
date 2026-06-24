import React from "react";
import { Coins, Clock, CheckCircle2, Package, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { Order, Product } from "../types";

interface StatsOverviewProps {
  orders: Order[];
  products: Product[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ orders, products }) => {
  // Calculate stats
  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
  
  // Delivered orders sales sum
  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, o) => sum + (o.productPrice || 0) + (Number(o.deliveryCharge) || 0), 0);

  const stats = [
    {
      id: "revenue",
      title: "Total Revenue (BDT)",
      value: `৳${totalRevenue.toLocaleString()}`,
      subtitle: "From delivered products",
      icon: Coins,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
    },
    {
      id: "pending",
      title: "Pending Orders",
      value: pendingCount.toString(),
      subtitle: "Awaiting shipping fulfillment",
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-600",
      bgLight: "bg-amber-50",
    },
    {
      id: "delivered",
      title: "Delivered Orders",
      value: deliveredCount.toString(),
      subtitle: "Completed client deliveries",
      icon: CheckCircle2,
      color: "from-blue-500 to-indigo-600",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 no-print">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex items-center justify-between group"
          >
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {stat.title}
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-700 transition-all font-mono">
                {stat.value}
              </h3>
              <p className="text-xs text-slate-500">{stat.subtitle}</p>
            </div>
            <div className={`p-4 rounded-xl ${stat.bgLight} shrink-0 transition-transform group-hover:scale-110 duration-300`}>
              <Icon className={`w-6 h-6 ${stat.textColor}`} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
