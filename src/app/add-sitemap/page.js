"use client";

import { useState } from "react";
import axios from "axios";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function AddSitemap() {
	const [sitemapUrl, setSitemapUrl] = useState("");
	const [status, setStatus] = useState("");
	const [processedUrls, setProcessedUrls] = useState(0);
	const [totalUrls, setTotalUrls] = useState(0);
	const [allProcessed, setAllProcessed] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await axios.post("/api/add-sitemap", {
				sitemapUrl,
			});

			setStatus(response.data.message);
			setProcessedUrls(response.data.processedUrls);
			setTotalUrls(response.data.totalUrls);
			setAllProcessed(
				response.data.processedUrls === response.data.totalUrls
			);
		} catch (error) {
			console.error("Error adding sitemap:", error);
			setStatus("Error adding sitemap.");
		}
	};

	return (
		<div className='flex flex-col min-h-screen bg-white text-gray-800'>
			<Header />
			<main className='flex-grow flex flex-col items-center justify-center p-4'>
				<form onSubmit={handleSubmit} className='w-full max-w-md mb-6'>
					<input
						type='text'
						value={sitemapUrl}
						onChange={(e) => setSitemapUrl(e.target.value)}
						placeholder='Enter sitemap URL'
						className='border p-2 w-full text-black mb-4'
						required
					/>
					<button
						type='submit'
						className='bg-gray-700 text-white p-2 rounded w-full mb-4 hover:bg-gray-600 ease-in-out duration-300'
					>
						Add Sitemap
					</button>
				</form>
				{status && <p>{status}</p>}
				{totalUrls > 0 && (
					<p>{`${processedUrls} of ${totalUrls} URLs have been processed`}</p>
				)}
				{allProcessed && (
					<p>
						All of the URLs for this sitemap have been processed,{" "}
						<a
							href={`/?sitemapUrl=${encodeURIComponent(
								sitemapUrl
							)}`}
							className='text-blue-500 underline'
						>
							click here to see results
						</a>
						.
					</p>
				)}
			</main>
			<Footer />
		</div>
	);
}
