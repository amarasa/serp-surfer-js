import Link from "next/link";

export default function Header() {
	return (
		<header className='bg-blue-600 text-white p-4 text-center'>
			<h1 className='text-3xl font-bold'>SERP Surfer</h1>
			<nav className='mt-4'>
				<ul className='flex justify-center space-x-4'>
					<li>
						<Link href='/'>
							<span className='text-white hover:underline cursor-pointer'>
								My Results
							</span>
						</Link>
					</li>
					<li>
						<Link href='/add-sitemap'>
							<span className='text-white hover:underline cursor-pointer'>
								Add Sitemap
							</span>
						</Link>
					</li>
				</ul>
			</nav>
		</header>
	);
}
