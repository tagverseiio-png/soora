'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
    const { user } = useAuth();
    const router = useRouter();

    // Redirect authenticated users to shop
    useEffect(() => {
        if (user) {
            router.push('/shop');
        }
    }, [user, router]);

    const handleEnter = () => {
        router.push('/shop');
    };

    return <LandingPage onEnter={handleEnter} />;
}
