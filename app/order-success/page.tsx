"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Home, ShoppingBag, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";

type OrderDetail = {
    id: string;
    orderNumber: string;
    customerEmail?: string | null;
    lalamoveOrderId?: string | null;
    lalamoveTrackingUrl?: string | null;
    lalamoveStatus?: string | null;
};

export default function OrderSuccessPage() {
    const params = useSearchParams();
    const orderId = params.get("orderId");
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [trackingStatus, setTrackingStatus] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchOrder() {
            if (!orderId) {
                setLoading(false);
                return;
            }
            try {
                const data = await apiClient.get<OrderDetail & { user?: { email?: string } }>(`/orders/${orderId}`);
                if (!isMounted) return;
                setOrder({
                    id: data.id,
                    orderNumber: data.orderNumber,
                    customerEmail: (data as any)?.user?.email ?? undefined,
                    lalamoveOrderId: (data as any)?.lalamoveOrderId,
                    lalamoveTrackingUrl: (data as any)?.lalamoveTrackingUrl,
                    lalamoveStatus: (data as any)?.lalamoveStatus,
                });
            } catch (_) {
                // silently ignore for success page
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchOrder();
        return () => { isMounted = false; };
    }, [orderId]);

    const handleTrackDelivery = async () => {
        if (!orderId) return;
        setTrackingError(null);
        setTrackingStatus(null);
        setTrackingLoading(true);
        try {
            if (order?.lalamoveTrackingUrl) {
                window.open(order.lalamoveTrackingUrl, "_blank");
                return;
            }
            const data: any = await apiClient.get(`/delivery/track/${orderId}`);
            const status = data?.data?.status || data?.status || order?.lalamoveStatus;
            const shareLink = data?.data?.shareLink || data?.shareLink;
            if (shareLink) {
                window.open(shareLink, "_blank");
            }
            if (status) {
                setTrackingStatus(status);
            }
        } catch (_) {
            setTrackingError("Unable to fetch delivery status right now. Please try again shortly.");
        } finally {
            setTrackingLoading(false);
        }
    };

    const referenceText = order?.orderNumber ? `#${order.orderNumber}` : (orderId ? `#${orderId}` : "#ORDER");
    const emailText = order?.customerEmail ?? "";

    return (
        <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-sm border border-green-100">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-serif text-[#1d1d1f]">Thank you!</h1>
                    <p className="text-gray-500 text-lg">Your order has been placed successfully.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <span className="text-sm text-gray-500">Order Reference</span>
                        <span className="font-mono font-medium text-[#1d1d1f]">{referenceText}</span>
                    </div>
                    {emailText && (
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Confirmation sent to</p>
                            <p className="font-medium text-[#1d1d1f]">{emailText}</p>
                        </div>
                    )}
                    {(order?.lalamoveOrderId || order?.lalamoveTrackingUrl || trackingStatus) && (
                        <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex items-center justify-between text-sm text-[#1d1d1f]">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#0071e3]" />
                                    <span className="font-medium">Delivery status</span>
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{trackingStatus || order?.lalamoveStatus || "DISPATCHED"}</span>
                            </div>
                            {trackingError && (
                                <p className="mt-2 text-xs text-red-500">{trackingError}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {(order?.lalamoveOrderId || order?.lalamoveTrackingUrl) && (
                        <Button
                            className="w-full h-12 bg-[#0071e3] hover:bg-[#005bb5] text-white gap-2"
                            variant="default"
                            onClick={handleTrackDelivery}
                            disabled={trackingLoading}
                        >
                            {trackingLoading ? "Checking delivery..." : "Track Delivery"}
                        </Button>
                    )}
                    <Link href="/">
                        <Button className="w-full h-12 bg-[#1d1d1f] hover:bg-black text-white gap-2">
                            <ShoppingBag className="w-4 h-4" /> Continue Shopping
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="w-full text-gray-500 hover:text-[#1d1d1f]">
                            <Home className="w-4 h-4 mr-2" /> Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
