'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, User, Home, Clock, ChevronDown, ArrowRight, Package, LogOut, MapPin } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import Overlay from '@/components/Overlay';
import SlideToPay from '@/components/SlideToPay';
import { CATEGORIES } from '@/lib/data';
import { Product } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { usersApi, type Address } from '@/lib/api';
import { reverseGeocode } from '@/lib/utils';
import HeroImage from '@/components/HeroImage';

export default function ShopPage() {
    const { user, signOut, selectedAddress, addresses, setSelectedAddress, fetchAddresses, refreshUser } = useAuth();
    const router = useRouter();
    const [cart, setCart] = useState<Product[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [newAddress, setNewAddress] = useState<{ type: string; name: string; street: string; unit?: string; building?: string; postalCode: string; district: string; latitude?: number; longitude?: number; isDefault: boolean; deliveryNotes?: string }>({
        type: 'HOME',
        name: '',
        street: '',
        unit: '',
        building: '',
        postalCode: '',
        district: '',
        latitude: undefined,
        longitude: undefined,
        isDefault: false,
        deliveryNotes: ''
    });
    const [activeCategory, setActiveCategory] = useState("All");
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState({ name: '', phone: '' });
    const [profileForm, setProfileForm] = useState({ name: '', phone: '' });

    // Fetch products from backend with dev guard to avoid duplicate fetches
    const didFetchProducts = useRef(false);
    const productsInFlight = useRef<Promise<void> | null>(null);
    const productsCooldownUntil = useRef<number>(0);
    const productsRetryScheduled = useRef(false);

    const fetchProducts = useCallback(async () => {
        const now = Date.now();
        if (productsCooldownUntil.current && now < productsCooldownUntil.current) {
            return;
        }
        if (productsInFlight.current) {
            return productsInFlight.current;
        }
        if (didFetchProducts.current) {
            return;
        }

        const run = (async () => {
            try {
                const response = await apiClient.request('/products');
                const list = Array.isArray(response)
                    ? response
                    : (response as any)?.products || [];
                setProducts(list);
                didFetchProducts.current = true;
            } catch (error: any) {
                const status = error?.status || error?.response?.status;
                if (status === 429) {
                    // Retry once after a short delay, then back off for 60s
                    if (!productsRetryScheduled.current) {
                        productsRetryScheduled.current = true;
                        setTimeout(() => {
                            productsCooldownUntil.current = 0;
                            productsInFlight.current = null;
                            fetchProducts();
                        }, 3000);
                    } else {
                        productsCooldownUntil.current = Date.now() + 60_000;
                        console.warn('Products fetch rate-limited (429). Cooling down for 60s.');
                    }
                }
                console.error('Failed to fetch products:', error);
                setProducts([]);
            } finally {
                productsInFlight.current = null;
                setLoading(false);
            }
        })();

        productsInFlight.current = run;
        return run;
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Load cart from localStorage on first mount
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const raw = localStorage.getItem('cart_items');
                if (raw) {
                    const saved = JSON.parse(raw);
                    if (Array.isArray(saved)) {
                        setCart(saved);
                    }
                }
            }
        } catch (_) {}
    }, []);

    // Keep inline profile form in sync when user or panel opens
    useEffect(() => {
        if (user) {
            setProfileForm({ name: user.name || '', phone: user.phone || '' });
        }
    }, [user, isProfileOpen]);

    // Fetch orders when user is authenticated
    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) {
                setOrders([]);
                return;
            }
            try {
                const response = await apiClient.request('/orders/my-orders');
                const orderList = Array.isArray(response) ? response : (response.orders || []);
                setOrders(orderList);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                setOrders([]);
            }
        };
        fetchOrders();
    }, [user]);

    // Ensure addresses are loaded
    useEffect(() => {
        if (user) {
            fetchAddresses().catch(() => {});
        }
    }, [user, fetchAddresses]);

    // Check profile completion
    useEffect(() => {
        if (user && !user.name && !user.phone) {
            setProfileData({ name: user.name || '', phone: user.phone || '' });
            setIsProfileModalOpen(true);
        }
    }, [user]);

    const getItemCount = (productId: string) => cart.filter(item => item.id === productId).length;
    // Ensure cart item carries a usable image URL
    const addToCart = (product: Product) => {
        const image = product.image || product.images?.[0] || '/placeholder.png';
        const next = [...cart, { ...product, image }];
        setCart(next);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('cart_items', JSON.stringify(next));
            }
        } catch (_) {}
    };
    const removeFromCart = (product: Product) => {
        const index = cart.findIndex(item => item.id === product.id);
        if (index > -1) {
            const newCart = [...cart];
            newCart.splice(index, 1);
            setCart(newCart);
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('cart_items', JSON.stringify(newCart));
                }
            } catch (_) {}
        }
    };
    const cartTotal = cart.reduce((acc, item) => acc + item.price, 0);

    const featuredProducts = products.filter(p => p.isFeatured === true);
    const displayedProducts = activeCategory === 'All'
        ? products
        : products.filter(p => p.category === activeCategory);

    const displayName = user?.name || user?.email || 'User';
    const userInitial = displayName.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-[#F9F9F9] font-sans text-[#1d1d1f] selection:bg-[#1d1d1f] selection:text-white animate-in slide-in-from-top-full duration-700">
            <header className="sticky top-0 z-40 w-full transition-all duration-300">
                <div className="absolute inset-0 bg-[#F9F9F9]/85 backdrop-blur-md border-b border-gray-200/50" />
                <div className="relative max-w-7xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <Link href="/">
                            <img src="/logo.png" alt="Soora Logo" className="h-10 md:h-16 w-auto object-contain cursor-pointer" />
                        </Link>
                        <nav className="hidden md:flex items-center gap-8">
                            {CATEGORIES.slice(1).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${activeCategory === cat ? 'text-[#1d1d1f]' : 'text-gray-400 hover:text-[#1d1d1f]'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setIsLocationOpen(true)} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity bg-white/50 px-3 py-1.5 rounded-full border border-black/5">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <span className="text-[10px] text-gray-500 hidden sm:inline uppercase tracking-wider font-medium">Delivery to</span>
                            <span className="text-[12px] font-bold text-[#1d1d1f] flex items-center gap-1">{selectedAddress?.name || 'Select address'} <ChevronDown className="w-3 h-3" /></span>
                        </button>
                        <div onClick={() => setIsSearchOpen(true)} className="hidden md:flex items-center gap-2 bg-white hover:bg-white/80 px-3 py-1.5 rounded-full border border-transparent hover:border-gray-200 transition-all cursor-pointer w-48 shadow-sm">
                            <Search className="w-4 h-4 text-gray-400 ml-1" />
                            <span className="text-[12px] text-gray-400 font-normal">Search Soora</span>
                        </div>
                        <button onClick={() => setIsSearchOpen(true)} className="md:hidden text-[#1d1d1f] hover:opacity-70 p-1"><Search className="w-5 h-5 stroke-[1.5]" /></button>
                        <button onClick={() => setIsProfileOpen(true)} className="text-[#1d1d1f] hover:text-[#0071e3] p-1"><User className="w-5 h-5 stroke-[1.5]" /></button>
                        <button onClick={() => setIsCartOpen(true)} className="relative text-[#1d1d1f] hover:text-[#0071e3] p-1">
                            <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                            {cart.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#1d1d1f] rounded-full ring-2 ring-[#f5f5f7]" />}
                        </button>
                    </div>
                </div>

                <div className="md:hidden relative border-t border-gray-200/30">
                    <div className="flex gap-3 px-6 py-3 overflow-x-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap px-4 py-2 rounded-full transition-all ${activeCategory === cat
                                    ? 'bg-[#1d1d1f] text-white shadow-md'
                                    : 'bg-white text-gray-500 border border-gray-100'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-12 pb-32">

                {activeCategory === 'All' ? (
                    <>
                        <div className="mb-16 md:mb-24 rounded-[4px] overflow-hidden relative h-[450px] md:h-[600px] shadow-2xl group">
                            <HeroImage
                                category="whisky"
                                alt="Hero"
                                className="w-full h-full"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent p-8 md:p-16 flex flex-col justify-end text-white">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] mb-4 text-white/80">Holiday 2025</p>
                                <h2 className="text-5xl md:text-8xl font-serif leading-[0.9] mb-8 tracking-tight">The Art of <br /><span className="italic font-light opacity-80">Celebration.</span></h2>
                                <button className="bg-white text-black px-8 py-3.5 rounded-full self-start font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">Shop Collection</button>
                            </div>
                        </div>

                        <div className="mb-20 md:mb-32">
                            <h3 className="text-3xl font-serif font-medium text-[#1d1d1f] mb-8 tracking-tight">Shop by Category</h3>
                            <div className="flex gap-6 overflow-x-auto no-scrollbar pb-8">
                                {CATEGORIES.slice(1).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className="min-w-[160px] h-[220px] bg-white rounded-[4px] p-8 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-100 group text-left"
                                    >
                                        <span className="text-2xl font-serif text-gray-900 group-hover:text-[#0071e3] transition-colors">{cat}</span>
                                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-[#1d1d1f] group-hover:border-[#1d1d1f] group-hover:text-white transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-20 md:mb-32">
                            <div className="flex justify-between items-baseline mb-8">
                                <h3 className="text-3xl font-serif font-medium text-[#1d1d1f] tracking-tight">Curator&apos;s Choice</h3>
                                <button className="text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-black transition-colors">View Editorial</button>
                            </div>
                            <div className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar pb-12 -mx-4 px-4 md:-mx-6 md:px-6">
                                {featuredProducts.map(product => (
                                    <div key={product.id} className="min-w-[280px] md:min-w-[340px]">
                                        <ProductCard
                                            product={product}
                                            count={getItemCount(product.id)}
                                            onAdd={addToCart}
                                            onRemove={removeFromCart}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-3xl font-serif font-medium text-[#1d1d1f] mb-8 tracking-tight">The Collection</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                                {displayedProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        count={getItemCount(product.id)}
                                        onAdd={addToCart}
                                        onRemove={removeFromCart}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-6 mb-12">
                            <button onClick={() => setActiveCategory('All')} className="text-gray-400 hover:text-black transition-colors"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                            <div>
                                <h2 className="text-5xl md:text-7xl font-serif text-[#1d1d1f] mb-2">{activeCategory}</h2>
                                <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">{displayedProducts.length} Labels</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            {displayedProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    count={getItemCount(product.id)}
                                    onAdd={addToCart}
                                    onRemove={removeFromCart}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
                <nav className="pointer-events-auto bg-[#1d1d1f]/90 backdrop-blur-2xl p-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 transition-transform hover:-translate-y-1 duration-300 ring-1 ring-black/5">
                    <button className="flex flex-col items-center justify-center w-16 h-14 rounded-full bg-white/10 text-white transition-all active:scale-95 shadow-inner" onClick={() => setActiveCategory('All')}>
                        <Home className="w-5 h-5 mb-0.5" strokeWidth={1.5} />
                        <span className="text-[9px] font-medium tracking-wide opacity-90">Home</span>
                    </button>
                    <button onClick={() => setIsProfileOpen(true)} className="flex flex-col items-center justify-center w-16 h-14 rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-all active:scale-95">
                        <Clock className="w-5 h-5 mb-0.5" strokeWidth={1.5} />
                        <span className="text-[9px] font-medium tracking-wide opacity-90">Orders</span>
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-2"></div>
                    <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-4 pl-6 pr-8 h-14 rounded-full bg-white text-black hover:bg-gray-100 transition-all active:scale-95 shadow-lg">
                        <div className="relative">
                            <ShoppingBag className="w-5 h-5 text-black" strokeWidth={1.5} />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1d1d1f] border-2 border-white rounded-full" />}
                        </div>
                        <div className="flex flex-col items-start leading-none gap-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cart</span>
                            <span className="text-[13px] font-bold tracking-tight">{cart.length} Items</span>
                        </div>
                    </button>
                </nav>
            </div>

            <Overlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title="Shopping Bag">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <ShoppingBag className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">Your bag is empty.</h3>
                        <p className="text-[14px] text-gray-500 mb-6 max-w-xs">Free delivery on all orders over S$200. Start adding your favorites.</p>
                        <button onClick={() => setIsCartOpen(false)} className="text-[#0071e3] text-[14px] font-medium hover:underline">Continue Shopping</button>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-8">
                            {Array.from(new Set(cart.map(i => i.id))).map(id => {
                                const item = cart.find(i => i.id === id)!;
                                const count = getItemCount(id);
                                return (
                                    <div key={id} className="flex gap-4">
                                        <div className="w-20 h-24 bg-[#f5f5f7] rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={item.image || item.images?.[0] || '/placeholder.png'} className="w-full h-full object-cover" alt={item.name} />
                                        </div>
                                        <div className="flex-1 py-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-[15px] font-semibold text-[#1d1d1f] leading-snug">{item.name}</h4>
                                                <span className="text-[15px] font-semibold text-[#1d1d1f]">S${(item.price * count).toLocaleString()}</span>
                                            </div>
                                            <p className="text-[13px] text-gray-500 mb-3">{item.brand}</p>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => removeFromCart(item)} className="text-[#0071e3] text-[13px] font-medium">Remove</button>
                                                <span className="text-[13px] text-gray-900">Qty {count}</span>
                                                <button onClick={() => addToCart(item)} className="text-[#0071e3] text-[13px] font-medium">Add</button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex justify-between mb-2">
                                <span className="text-[14px] text-gray-500">Subtotal</span>
                                <span className="text-[14px] font-medium text-[#1d1d1f]">S${cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between mb-8">
                                <span className="text-[14px] text-gray-500">Shipping</span>
                                <span className="text-[14px] font-medium text-[#1d1d1f]">Free</span>
                            </div>
                            <SlideToPay 
                                total={cartTotal} 
                                onComplete={() => { 
                                    if (!user?.name || !user?.phone) {
                                        alert('Please complete your profile first.');
                                        setIsCartOpen(false);
                                        setIsProfileModalOpen(true);
                                        return;
                                    }
                                    if (!selectedAddress) {
                                        alert('Please select a delivery address.');
                                        setIsLocationOpen(true);
                                        return;
                                    }
                                    router.push('/checkout');
                                }} 
                            />
                        </div>
                    </div>
                )}
            </Overlay>

            <Overlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Search">
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search for products, brands..." className="w-full bg-[#f5f5f7] rounded-xl pl-12 pr-4 py-3 text-[17px] outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all placeholder:text-gray-500" autoFocus />
                </div>
                <div>
                    <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-4">Trending</h3>
                    <div className="space-y-3">
                        {['Japanese Whisky', 'Gin & Tonic Kit', 'Gift Sets', 'Suntory'].map(term => (
                            <div key={term} className="flex items-center gap-3 text-[#1d1d1f] hover:text-[#0071e3] cursor-pointer py-1">
                                <Search className="w-4 h-4 text-gray-400" />
                                <span className="text-[15px]">{term}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Overlay>

            <Overlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Account">
                {!user ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <User className="w-16 h-16 text-gray-300 mb-6" />
                        <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">Sign in to your account</h3>
                        <p className="text-[14px] text-gray-500 mb-8 max-w-xs">Access your orders, saved addresses, and personalized recommendations.</p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <Link href="/login" onClick={() => setIsProfileOpen(false)} className="w-full bg-[#1d1d1f] text-white py-3 rounded-xl font-semibold text-[14px] hover:bg-black transition-all text-center">
                                Sign in
                            </Link>
                            <Link href="/signup" onClick={() => setIsProfileOpen(false)} className="w-full bg-white text-[#1d1d1f] py-3 rounded-xl font-semibold text-[14px] border border-gray-200 hover:bg-gray-50 transition-all text-center">
                                Create account
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-semibold text-gray-400 mb-4">
                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <h3 className="text-[21px] font-semibold text-[#1d1d1f]">{user?.name || 'User'}</h3>
                            <p className="text-[14px] text-gray-500">{user?.email}</p>
                        </div>
                        <div className="space-y-8">
                            {/* Editable Profile Section */}
                            <div className="p-4 rounded-lg bg-[#f5f5f7] border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[17px] font-semibold text-[#1d1d1f]">Profile</h4>
                                    {!isEditingProfile ? (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="text-[13px] font-medium text-[#0071e3] hover:underline"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setIsEditingProfile(false);
                                                setProfileForm({ name: user?.name || '', phone: user?.phone || '' });
                                            }}
                                            className="text-[13px] font-medium text-gray-600 hover:underline"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                {!isEditingProfile ? (
                                    <div className="space-y-1 text-[14px] text-gray-700">
                                        <p><span className="text-gray-500">Name:</span> {user?.name || '—'}</p>
                                        <p><span className="text-gray-500">Phone:</span> {user?.phone || '—'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[12px] font-medium text-gray-600">Full Name</label>
                                            <input
                                                type="text"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                placeholder="Enter your full name"
                                                className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[12px] font-medium text-gray-600">Phone</label>
                                            <input
                                                type="tel"
                                                value={profileForm.phone}
                                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                                placeholder="e.g. +65 81234567"
                                                className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                            />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!profileForm.name || !profileForm.phone) {
                                                    alert('Please fill in name and phone');
                                                    return;
                                                }
                                                try {
                                                    await apiClient.request('/users/profile', {
                                                        method: 'PUT',
                                                        body: JSON.stringify(profileForm),
                                                    });
                                                    await refreshUser();
                                                    setIsEditingProfile(false);
                                                } catch (_) {
                                                    alert('Failed to save profile');
                                                }
                                            }}
                                            className="w-full bg-[#1d1d1f] text-white px-4 py-2 rounded-md text-[14px] font-semibold"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-baseline mb-4">
                                    <h4 className="text-[17px] font-semibold text-[#1d1d1f]">Recent Orders</h4>
                                </div>
                                {orders.length === 0 ? (
                                    <div className="text-center text-gray-500 text-[14px] py-8">
                                        No orders yet
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orders.slice(0, 3).map(order => (
                                            <div key={order.id} className="p-4 rounded-lg bg-[#f5f5f7] border border-gray-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[13px] font-semibold text-[#1d1d1f]">Order #{order.orderNumber || order.id.slice(0, 8)}</span>
                                                    <span className="text-[11px] font-medium text-gray-500">{order.status}</span>
                                                </div>
                                                <p className="text-[12px] text-gray-600">S${(order.total || 0).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={async () => {
                                    await signOut();
                                    setIsProfileOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-[14px]"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    </>
                )}
            </Overlay>

            <Overlay isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title="Delivery Location">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[14px] font-semibold text-[#1d1d1f]">Saved Addresses</h4>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={async () => {
                                    if (!('geolocation' in navigator)) {
                                        alert('Geolocation not supported on this device');
                                        return;
                                    }
                                    navigator.geolocation.getCurrentPosition(
                                        async (pos) => {
                                            try {
                                                const info = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                                                setIsAddingAddress(true);
                                                setNewAddress({
                                                    type: 'HOME',
                                                    name: 'Current Location',
                                                    street: info.street || '',
                                                    unit: '',
                                                    building: info.building || '',
                                                    postalCode: info.postalCode || '',
                                                    district: info.district || '',
                                                    latitude: pos.coords.latitude,
                                                    longitude: pos.coords.longitude,
                                                    isDefault: true,
                                                    deliveryNotes: ''
                                                });
                                            } catch (e) {
                                                alert('Failed to fetch address from location');
                                            }
                                        },
                                        () => alert('Location permission denied'),
                                        { enableHighAccuracy: true, timeout: 10000 }
                                    );
                                }}
                                className="text-[13px] font-medium text-[#1d1d1f] hover:underline"
                            >
                                Use current location
                            </button>
                            <button
                                onClick={() => setIsAddingAddress(!isAddingAddress)}
                                className="text-[13px] font-medium text-[#0071e3] hover:underline"
                            >
                                {isAddingAddress ? 'Cancel' : 'Add New'}
                            </button>
                        </div>
                    </div>

                    {isAddingAddress && (
                        <div className="space-y-3 p-4 bg-[#f5f5f7] rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">Label</label>
                                    <input
                                        type="text"
                                        value={newAddress.name}
                                        onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                                        placeholder="e.g. Home, Office"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">Type</label>
                                    <select
                                        value={newAddress.type}
                                        onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    >
                                        <option value="HOME">HOME</option>
                                        <option value="WORK">WORK</option>
                                        <option value="OTHER">OTHER</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2">
                                    <label className="text-[12px] font-medium text-gray-600">Street</label>
                                    <input
                                        type="text"
                                        value={newAddress.street}
                                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                        placeholder="Street address"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                                {typeof newAddress.latitude === 'number' && typeof newAddress.longitude === 'number' && (
                                    <div className="md:col-span-2">
                                        <label className="text-[12px] font-medium text-gray-600">Coordinates</label>
                                        <div className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200 text-gray-700">
                                            Lat: {newAddress.latitude.toFixed(6)}, Lng: {newAddress.longitude.toFixed(6)}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">Unit</label>
                                    <input
                                        type="text"
                                        value={newAddress.unit}
                                        onChange={(e) => setNewAddress({ ...newAddress, unit: e.target.value })}
                                        placeholder="#12-34"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">Building</label>
                                    <input
                                        type="text"
                                        value={newAddress.building}
                                        onChange={(e) => setNewAddress({ ...newAddress, building: e.target.value })}
                                        placeholder="Building name (optional)"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">Postal Code</label>
                                    <input
                                        type="text"
                                        value={newAddress.postalCode}
                                        onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                                        placeholder="e.g. 018956"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-medium text-gray-600">District</label>
                                    <input
                                        type="text"
                                        value={newAddress.district}
                                        onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                                        placeholder="e.g. Marina Bay"
                                        className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[12px] font-medium text-gray-600">Delivery Notes</label>
                                <input
                                    type="text"
                                    value={newAddress.deliveryNotes}
                                    onChange={(e) => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
                                    placeholder="Gate code, concierge, etc. (optional)"
                                    className="w-full bg-white rounded-md px-3 py-2 text-[14px] border border-gray-200"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="addr-default"
                                    type="checkbox"
                                    checked={newAddress.isDefault}
                                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="addr-default" className="text-[13px] text-gray-700">Set as default address</label>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                                        if (!user || !token) {
                                            alert('Please log in to save an address');
                                            router.push('/login');
                                            return;
                                        }
                                        if (!newAddress.name || !newAddress.street || !newAddress.postalCode || !newAddress.district) {
                                            alert('Please fill in name, street, postal code, and district');
                                            return;
                                        }
                                        try {
                                            const created = await usersApi.createAddress(newAddress);
                                            await fetchAddresses();
                                            setSelectedAddress(created as unknown as Address);
                                            setIsAddingAddress(false);
                                            setIsLocationOpen(false);
                                        } catch (err: any) {
                                            if (err?.status === 401) {
                                                alert('Session expired. Please log in again to save addresses.');
                                                router.push('/login');
                                                return;
                                            }
                                            alert('Failed to add address');
                                        }
                                    }}
                                    className="bg-[#1d1d1f] text-white px-4 py-2 rounded-md text-[14px] font-semibold"
                                >
                                    Save Address
                                </button>
                                <button
                                    onClick={() => setIsAddingAddress(false)}
                                    className="bg-white text-[#1d1d1f] px-4 py-2 rounded-md text-[14px] border border-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {addresses.length === 0 && !isAddingAddress && (
                        <div className="text-center text-gray-500 text-[14px] py-8">
                            No addresses saved.
                        </div>
                    )}

                    {addresses.length > 0 && (
                        <div className="space-y-3">
                            {addresses.map(addr => (
                                <button
                                    key={addr.id}
                                    onClick={() => {
                                        setSelectedAddress(addr);
                                        setIsLocationOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                                        selectedAddress?.id === addr.id
                                            ? 'bg-indigo-50 border-indigo-300'
                                            : 'bg-white border-gray-200 hover:border-indigo-200'
                                    }`}
                                >
                                    <p className="text-[14px] font-semibold text-[#1d1d1f]">{addr.name}</p>
                                    <p className="text-[12px] text-gray-600">{addr.street} {addr.unit && `#${addr.unit}`}</p>
                                    <p className="text-[12px] text-gray-500">{addr.postalCode}, {addr.district}</p>
                                    {typeof addr.latitude === 'number' && typeof addr.longitude === 'number' && (
                                        <p className="text-[11px] text-gray-500">Lat: {addr.latitude.toFixed(6)}, Lng: {addr.longitude.toFixed(6)}</p>
                                    )}
                                    {addr.isDefault && <span className="text-[11px] text-green-600 font-medium">Default</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Overlay>

            {/* Profile Completion Modal */}
            <Overlay isOpen={isProfileModalOpen} onClose={() => {}} title="Complete Your Profile">
                <div className="space-y-4">
                    <div>
                        <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2">Full Name</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            placeholder="Enter your full name"
                            className="w-full bg-[#f5f5f7] rounded-lg px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                        />
                    </div>
                    <div>
                        <label className="text-[13px] font-semibold text-[#1d1d1f] block mb-2">Phone Number</label>
                        <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            placeholder="Enter your phone number"
                            className="w-full bg-[#f5f5f7] rounded-lg px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#0071e3]/20"
                        />
                    </div>
                    <button
                        onClick={async () => {
                            if (!profileData.name || !profileData.phone) {
                                alert('Please fill in all fields');
                                return;
                            }
                            try {
                                await apiClient.request('/users/profile', {
                                    method: 'PUT',
                                    body: JSON.stringify(profileData),
                                });
                                await refreshUser();
                                setIsProfileModalOpen(false);
                                setIsProfileOpen(false);
                            } catch (error) {
                                alert('Failed to update profile');
                            }
                        }}
                        className="w-full bg-[#1d1d1f] text-white py-3 rounded-lg font-semibold text-[14px] hover:bg-black transition-all"
                    >
                        Save Profile
                    </button>
                </div>
            </Overlay>

        </div>
    );
}
