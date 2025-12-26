"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/apiClient";

export default function CheckoutPage() {
    const router = useRouter();
    const { user, selectedAddress, addresses } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [selectedAddr, setSelectedAddr] = useState<any>(selectedAddress);

    useEffect(() => {
        // Redirect if not authenticated or missing profile
        if (!user) {
            router.push('/login');
            return;
        }
        if (!user.name || !user.phone) {
            router.push('/');
            return;
        }
        if (!selectedAddress && addresses.length > 0) {
            setSelectedAddr(addresses[0]);
        }
    }, [user, selectedAddress, addresses, router]);

    if (!user || !user.name || !user.phone) {
        return (
            <div className="min-h-screen bg-[#F9F9F9] p-4 md:p-8 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Redirecting...</p>
                </div>
            </div>
        );
    }

    const total = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAddr) {
            alert('Please select a delivery address');
            return;
        }
        setIsLoading(true);
        try {
            const orderPayload = {
                addressId: selectedAddr.id,
                items: cart.map(item => ({ productId: item.id, quantity: item.quantity || 1 })),
                paymentMethod: 'STRIPE',
                deliveryNotes: '',
            };
            await apiClient.request('/orders', {
                method: 'POST',
                body: JSON.stringify(orderPayload),
            });
            router.push('/order-success');
        } catch (error) {
            alert('Checkout failed. Please try again.');
            console.error('Checkout error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Shop
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Checkout Form */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-serif text-[#1d1d1f] mb-2">Checkout</h1>
                            <p className="text-gray-500">Complete your purchase securely.</p>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-6">
                            <Card className="border-white/60 shadow-sm bg-white/80 backdrop-blur">
                                <CardHeader>
                                    <CardTitle>Delivery Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input id="firstName" value={user?.name?.split(' ')[0] || ''} disabled className="bg-gray-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input id="lastName" value={user?.name?.split(' ').slice(1).join(' ') || ''} disabled className="bg-gray-100" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={user?.email || ''} disabled className="bg-gray-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input id="phone" value={user?.phone || ''} disabled className="bg-gray-100" />
                                    </div>
                                    {addresses.length > 0 && (
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Select Address</Label>
                                            <select
                                                id="address"
                                                value={selectedAddr?.id || ''}
                                                onChange={(e) => setSelectedAddr(addresses.find(a => a.id === e.target.value))}
                                                className="w-full h-10 border border-gray-300 rounded-md px-3 py-2"
                                            >
                                                <option value="">Choose an address</option>
                                                {addresses.map(addr => (
                                                    <option key={addr.id} value={addr.id}>
                                                        {addr.name} - {addr.street}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-white/60 shadow-sm bg-white/80 backdrop-blur">
                                <CardHeader>
                                    <CardTitle>Payment Method</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-lg flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                        <span className="text-sm text-indigo-900 font-medium">All transactions are secure and encrypted.</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="card">Card Number</Label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input id="card" placeholder="0000 0000 0000 0000" className="pl-10" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expiry">Expiry</Label>
                                            <Input id="expiry" placeholder="MM/YY" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cvc">CVC</Label>
                                            <Input id="cvc" placeholder="123" required />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button type="submit" className="w-full h-12 text-lg bg-[#1d1d1f] hover:bg-black text-white" disabled={isLoading}>
                                {isLoading ? "Processing..." : `Pay S$${total.toLocaleString()}`}
                            </Button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <Card className="border-none shadow-none bg-transparent md:bg-white md:shadow-sm md:sticky md:top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" /> Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {cart.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        Cart is empty. <Link href="/" className="text-[#0071e3] font-medium">Continue shopping</Link>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden relative">
                                                <img src={item.images?.[0] || item.image || '/placeholder.png'} alt={item.name} className="object-cover w-full h-full" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-sm">{item.name}</h4>
                                                <p className="text-xs text-gray-500">{item.brand}</p>
                                                <p className="text-sm font-medium mt-1">S${(item.price * (item.quantity || 1)).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span>S${total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Shipping</span>
                                        <span className="text-green-600 font-medium">Free</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                                        <span>Total</span>
                                        <span>S${total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
