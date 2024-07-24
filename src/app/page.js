"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
	const [sitemapUrl, setSitemapUrl] = useState("");
	const [urls, setUrls] = useState([]);
	const [checking, setChecking] = useState(false);
	const [progress, setProgress] = useState(0);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredUrls, setFilteredUrls] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(12);
	const [sortConfig, setSortConfig] = useState({
		key: null,
		direction: null,
	});
	const [statusFilter, setStatusFilter] = useState("all");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setChecking(true);
		setProgress(0);
		setUrls([]); // Clear URLs to avoid showing an empty table during scraping

		try {
			// Fetch URLs from sitemap
			const response = await axios.get(
				`/api/fetch-sitemap?sitemapUrl=${encodeURIComponent(
					sitemapUrl
				)}`
			);
			const { sitemapUrls } = response.data;

			// Fetch URLs from the database
			const dbResponse = await axios.get(
				`/api/sitemap?sitemapUrl=${encodeURIComponent(sitemapUrl)}`
			);
			const dbUrls = dbResponse.data.data;

			const urlsToScrape = sitemapUrls.filter((url) => {
				const dbUrl = dbUrls.find((dbUrl) => dbUrl.page_url === url);
				const now = new Date();
				const lastScan = dbUrl
					? new Date(dbUrl.last_scan)
					: new Date(0);
				const timeDifference = (now - lastScan) / (1000 * 60 * 60); // Difference in hours
				return !dbUrl || timeDifference > 24;
			});

			const totalScrapeTime = urlsToScrape.length * 10 * 1000; // 10 seconds per URL
			const additionalTime = Math.floor(Math.random() * 15000) + 15000; // 15 to 30 seconds
			const totalTime = totalScrapeTime + additionalTime;

			let currentProgress = 0;
			const interval = setInterval(() => {
				currentProgress += 100 / (totalTime / 1000);
				setProgress(currentProgress > 100 ? 100 : currentProgress);
			}, 1000);

			const indexedUrls = await Promise.all(
				sitemapUrls.map(async (url) => {
					const dbUrl = dbUrls.find(
						(dbUrl) => dbUrl.page_url === url
					);
					const now = new Date();

					if (!urlsToScrape.includes(url)) {
						return dbUrl;
					}

					await new Promise((resolve) => setTimeout(resolve, 10000)); // Delay for 10 seconds between requests

					const res = await axios.get(
						`/api/check-url?url=${encodeURIComponent(
							url
						)}&sitemapUrl=${encodeURIComponent(sitemapUrl)}`
					);
					return { url, ...res.data, last_scan: now.toISOString() };
				})
			);

			clearInterval(interval);
			setProgress(100);

			// Wait for the progress bar to reach 100% before updating the table
			setTimeout(async () => {
				const finalDbResponse = await axios.get(
					`/api/sitemap?sitemapUrl=${encodeURIComponent(sitemapUrl)}`
				);
				setUrls(finalDbResponse.data.data);
				setChecking(false);
			}, (totalTime - currentProgress * 10) / 100);
		} catch (error) {
			console.error("Error fetching or parsing sitemap:", error);
			setChecking(false);
		}
	};

	useEffect(() => {
		setFilteredUrls(
			urls.filter((urlObj) => {
				const matchesSearchQuery =
					urlObj.page_title &&
					urlObj.page_title
						.toLowerCase()
						.includes(searchQuery.toLowerCase());
				const matchesStatusFilter =
					statusFilter === "all" ||
					(statusFilter === "indexed" && urlObj.index_status) ||
					(statusFilter === "not_indexed" && !urlObj.index_status);
				return matchesSearchQuery && matchesStatusFilter;
			})
		);
	}, [searchQuery, statusFilter, urls, rowsPerPage]);

	const indexOfLastRow = currentPage * rowsPerPage;
	const indexOfFirstRow = indexOfLastRow - rowsPerPage;
	const currentRows = filteredUrls.slice(indexOfFirstRow, indexOfLastRow);

	const paginate = (pageNumber) => setCurrentPage(pageNumber);
	const totalPages = Math.ceil(filteredUrls.length / rowsPerPage);

	const handleSort = (key) => {
		let direction = "ascending";
		if (sortConfig.key === key && sortConfig.direction === "ascending") {
			direction = "descending";
		}
		setSortConfig({ key, direction });
		setFilteredUrls((prevUrls) => {
			const sortedUrls = [...prevUrls].sort((a, b) => {
				if (a[key] < b[key]) {
					return direction === "ascending" ? -1 : 1;
				}
				if (a[key] > b[key]) {
					return direction === "ascending" ? 1 : -1;
				}
				return 0;
			});
			return sortedUrls;
		});
	};

	const getClassNamesFor = (name) => {
		if (!sortConfig) {
			return;
		}
		return sortConfig.key === name ? sortConfig.direction : undefined;
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
						className='bg-blue-500 text-white p-2 rounded w-full mb-4'
					>
						{checking ? "Checking..." : "Check Sitemap"}
					</button>
				</form>
				{checking && (
					<div className='w-full max-w-md mb-4'>
						<div
							className='w-full bg-gray-200 rounded-full'
							style={{ height: "24px" }}
						>
							<div
								className='bg-blue-600 text-xs font-medium text-blue-100 text-center flex items-center justify-center p-0.5 leading-none rounded-full'
								style={{
									width: `${progress}%`,
									height: "24px",
								}}
							>
								{Math.round(progress)}%
							</div>
						</div>
					</div>
				)}
				{urls.length > 0 && !checking && (
					<div className='flex flex-col w-full max-w-6xl'>
						<div className='-m-1.5 overflow-x-auto'>
							<div className='p-1.5 min-w-full inline-block align-middle'>
								<div className='border rounded-lg divide-y divide-gray-200'>
									<div className='py-3 px-4'>
										<div className='flex justify-between items-center'>
											<div className='relative max-w-xs'>
												<label className='sr-only'>
													Search
												</label>
												<input
													type='text'
													value={searchQuery}
													onChange={(e) =>
														setSearchQuery(
															e.target.value
														)
													}
													className='py-2 px-3 ps-9 block w-full border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none'
													placeholder='Search for items'
												/>
												<div className='absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3'>
													<svg
														className='size-4 text-gray-400'
														xmlns='http://www.w3.org/2000/svg'
														width='24'
														height='24'
														viewBox='0 0 24 24'
														fill='none'
														stroke='currentColor'
														strokeWidth='2'
														strokeLinecap='round'
														strokeLinejoin='round'
													>
														<circle
															cx='11'
															cy='11'
															r='8'
														></circle>
														<path d='m21 21-4.3-4.3'></path>
													</svg>
												</div>
											</div>
											<div>
												<select
													onChange={(e) =>
														setStatusFilter(
															e.target.value
														)
													}
													className='py-2 px-3 border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none'
												>
													<option value='all'>
														Show All
													</option>
													<option value='indexed'>
														Indexed
													</option>
													<option value='not_indexed'>
														Not Indexed
													</option>
												</select>
											</div>
										</div>
									</div>
									<div className='overflow-hidden'>
										<table className='min-w-full divide-y divide-gray-200'>
											<thead className='bg-gray-50'>
												<tr>
													<th
														scope='col'
														className='py-3 px-4 pe-0 cursor-pointer'
													></th>
													<th
														scope='col'
														onClick={() =>
															handleSort(
																"page_title"
															)
														}
														className={`px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase cursor-pointer ${getClassNamesFor(
															"page_title"
														)}`}
													>
														Title{" "}
														{sortConfig.key ===
															"page_title" &&
															(sortConfig.direction ===
															"ascending"
																? "▲"
																: "▼")}
													</th>
													<th
														scope='col'
														className='px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase'
													></th>
													<th
														scope='col'
														onClick={() =>
															handleSort(
																"index_status"
															)
														}
														className={`px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase cursor-pointer ${getClassNamesFor(
															"index_status"
														)}`}
													>
														Status{" "}
														{sortConfig.key ===
															"index_status" &&
															(sortConfig.direction ===
															"ascending"
																? "▲"
																: "▼")}
													</th>
													<th
														scope='col'
														onClick={() =>
															handleSort(
																"last_scan"
															)
														}
														className={`px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase cursor-pointer ${getClassNamesFor(
															"last_scan"
														)}`}
													>
														Last Scan{" "}
														{sortConfig.key ===
															"last_scan" &&
															(sortConfig.direction ===
															"ascending"
																? "▲"
																: "▼")}
													</th>
												</tr>
											</thead>
											<tbody className='divide-y divide-gray-200'>
												{currentRows.map(
													(urlObj, index) => (
														<tr
															key={index}
															className='hover:bg-gray-50'
														>
															<td className='py-3 ps-4'>
																{index +
																	1 +
																	indexOfFirstRow}
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
																{urlObj.page_title ||
																	urlObj.page_url}
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm text-center flex space-x-2'>
																<a
																	href={`https://www.google.com/search?q=site:${urlObj.page_url}`}
																	target='_blank'
																	rel='noopener noreferrer'
																	className='text-blue-600 w-3.5 h-3.5 hover:opacity-50'
																>
																	<svg
																		className='w-3.5 h-3.5'
																		xmlns='http://www.w3.org/2000/svg'
																		viewBox='0 0 488 512'
																	>
																		<path
																			fill='#000000'
																			d='M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z'
																		/>
																	</svg>
																</a>
																<a
																	href={
																		urlObj.page_url
																	}
																	target='_blank'
																	rel='noopener noreferrer'
																	className='text-blue-600 w-3.5 h-3.5 hover:opacity-50'
																>
																	<svg
																		className='w-3.5 h-3.5'
																		xmlns='http://www.w3.org/2000/svg'
																		viewBox='0 0 512 512'
																	>
																		<path
																			fill='#000000'
																			d='M352 0c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9L370.7 96 201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L416 141.3l41.4 41.4c9.2 9.2 22.9 11.9 34.9 6.9s19.8-16.6 19.8-29.6l0-128c0-17.7-14.3-32-32-32L352 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z'
																		/>
																	</svg>
																</a>
															</td>

															<td className='px-6 py-4 whitespace-nowrap text-sm text-center'>
																{urlObj.index_status ? (
																	<svg
																		className='w-6 h-6 text-green-500'
																		xmlns='http://www.w3.org/2000/svg'
																		viewBox='0 0 512 512'
																	>
																		<path
																			fill='#157f1f'
																			d='M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z'
																		/>
																	</svg>
																) : (
																	<svg
																		className='w-6 h-6 text-red-500'
																		xmlns='http://www.w3.org/2000/svg'
																		viewBox='0 0 512 512'
																	>
																		<path
																			fill='#EC0B43'
																			d='M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z'
																		/>
																	</svg>
																)}
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-800'>
																{formatDistanceToNow(
																	new Date(
																		urlObj.last_scan
																	),
																	{
																		addSuffix: true,
																	}
																)}
															</td>
														</tr>
													)
												)}
											</tbody>
										</table>
									</div>

									<div className='py-1 px-4 flex justify-between items-center'>
										<div className='flex-grow'>
											{filteredUrls.length >
												rowsPerPage && (
												<nav
													className='flex items-center space-x-1'
													aria-label='Pagination'
												>
													<button
														type='button'
														onClick={() =>
															paginate(
																currentPage - 1
															)
														}
														className='p-2.5 min-w-[40px] inline-flex justify-center items-center gap-x-2 text-sm rounded-full text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none'
														disabled={
															currentPage === 1
														}
													>
														<span aria-hidden='true'>
															«
														</span>
														<span className='sr-only'>
															Previous
														</span>
													</button>
													{[
														...Array(
															totalPages
														).keys(),
													].map((number) => (
														<button
															key={number}
															type='button'
															onClick={() =>
																paginate(
																	number + 1
																)
															}
															className={`min-w-[40px] flex justify-center items-center py-2.5 text-sm rounded-full ${
																currentPage ===
																number + 1
																	? "bg-blue-600 text-white"
																	: "text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
															}`}
														>
															{number + 1}
														</button>
													))}
													<button
														type='button'
														onClick={() =>
															paginate(
																currentPage + 1
															)
														}
														className='p-2.5 min-w-[40px] inline-flex justify-center items-center gap-x-2 text-sm rounded-full text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none'
														disabled={
															currentPage ===
															totalPages
														}
													>
														<span className='sr-only'>
															Next
														</span>
														<span aria-hidden='true'>
															»
														</span>
													</button>
												</nav>
											)}
										</div>
										<div>
											<select
												value={rowsPerPage}
												onChange={(e) =>
													setRowsPerPage(
														parseInt(e.target.value)
													)
												}
												className='py-2 px-3 border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none'
											>
												<option value={12}>12</option>
												<option value={25}>25</option>
												<option value={50}>50</option>
												<option value={100}>100</option>
												<option value={200}>200</option>
											</select>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
			<Footer />
		</div>
	);
}
