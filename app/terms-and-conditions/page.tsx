'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <img src="/logo.png" alt="Soora Logo" className="h-10 w-auto" />
          <div className="w-20"></div> {/* Spacer for centering logo */}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-40 pb-24">
        <h1 className="text-4xl md:text-5xl font-serif mb-4 text-[#1a1a1a]">Terms and Conditions</h1>
        <p className="text-gray-400 text-sm mb-12 uppercase tracking-widest font-medium">Effective Date: April 2025 | Singapore</p>

        <div className="space-y-12 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using the Soora Express website and services, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">2. Eligibility</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must be 18 years of age or older to purchase alcohol in Singapore.</li>
              <li>By placing an order, you confirm that you and the recipient are of legal drinking age.</li>
              <li>Soora Express reserves the right to refuse delivery if age cannot be verified at the point of receipt.</li>
              <li>We do not deliver to minors. Any order suspected of being placed on behalf of a minor will be cancelled.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">3. Products & Availability</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All products listed on our platform are subject to availability.</li>
              <li>We reserve the right to discontinue, modify, or substitute any product without prior notice.</li>
              <li>Product images are for illustration purposes only. Actual packaging may vary.</li>
              <li>Vintage years, labels, and batch numbers may differ from images shown.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">4. Pricing & Payment</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are listed in Singapore Dollars (SGD) and inclusive of GST unless stated otherwise.</li>
              <li>Prices are subject to change without notice.</li>
              <li>Payment is required at the time of placing the order.</li>
              <li>We accept major credit/debit cards and approved digital payment methods.</li>
              <li>Soora Express uses secure, encrypted payment gateways. We do not store your card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">5. Orders & Delivery</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Orders are subject to confirmation and stock availability.</li>
              <li>We offer same-day delivery across eligible Singapore zones.</li>
              <li>Delivery times are estimates and may vary due to traffic, weather, or demand.</li>
              <li>A signature and proof of age may be required upon delivery.</li>
              <li>If the recipient is unavailable or cannot verify age, the order will be returned and a re-delivery fee may apply.</li>
              <li>Soora Express is not responsible for delays caused by incorrect address details provided by the customer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">6. Delivery Zones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Delivery is currently available within Singapore only.</li>
              <li>Certain areas (restricted zones, islands, or locations without road access) may not be eligible for delivery.</li>
              <li>Delivery to hotels, serviced apartments, and commercial addresses is permitted subject to access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">7. Refunds & Returns</h2>
            <p className="font-semibold mb-4 underline">All sales are final.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Soora Express does not offer refunds or returns on any purchased bottles once the order has been placed.</li>
              <li>We do not accept returns on delivered bottles under any circumstances, including change of mind, incorrect selection, or personal preference.</li>
              <li>No exchanges will be offered on opened or unopened bottles.</li>
              <li>By completing a purchase, you acknowledge and agree to this no-refund, no-return policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">8. Responsible Drinking</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Soora Express promotes responsible consumption of alcohol.</li>
              <li>We reserve the right to limit quantities purchased per order or per customer.</li>
              <li>We will not process orders that we reasonably believe are intended for resale without proper licensing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">9. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All content on this website including logos, product descriptions, images, and copy is the property of Soora Pte Ltd.</li>
              <li>Unauthorized reproduction, distribution, or commercial use of any content is strictly prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">10. Privacy Policy</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>By using our services, you consent to the collection and use of your data as outlined in our Privacy Policy.</li>
              <li>We do not sell or share your personal data with third parties except as required for order fulfillment or legal compliance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">11. Limitation of Liability</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Soora Express shall not be liable for any indirect, incidental, or consequential damages arising from the use of our platform or products.</li>
              <li>Our total liability in any claim shall not exceed the value of the order in question.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">12. Governing Law</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>These Terms and Conditions are governed by the laws of the Republic of Singapore.</li>
              <li>Any disputes shall be subject to the exclusive jurisdiction of the Singapore courts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">13. Changes to Terms</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Soora Express reserves the right to update these Terms at any time.</li>
              <li>Continued use of the platform after changes constitutes acceptance of the revised terms.</li>
              <li>The effective date at the top of this page will reflect the latest update.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif text-[#1a1a1a] mb-4">14. Contact Us</h2>
            <div className="space-y-1">
              <p>Soora Express — Soora Pte Ltd</p>
              <p>Email: <a href="mailto:hello@sooraaexpress.com" className="text-[#0071e3] hover:underline">hello@sooraaexpress.com</a></p>
              <p>Website: <a href="https://www.sooraaexpress.com" className="text-[#0071e3] hover:underline">www.sooraaexpress.com</a></p>
              <p>Location: Singapore</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-gray-100 bg-[#FAFAFA] text-gray-400 text-xs text-center">
        <p>© 2025 Soora Pte Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}
