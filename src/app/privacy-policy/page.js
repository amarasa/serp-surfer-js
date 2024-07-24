"use client";

import { useState } from "react";
import Header from "../../components/header";
import Footer from "../../components/footer";

export default function AddSitemap() {
	return (
		<div className='flex flex-col min-h-screen bg-white text-gray-800'>
			<Header />
			<main className='flex-grow flex flex-col items-center justify-center p-4'>
				Privacy Policy Content Here
			</main>
			<Footer />
		</div>
	);
}
