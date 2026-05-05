import Header from '@/components/shared/Header';
import HeroSection from '@/components/shared/HeroSection';
import CategoriesMosaicSection from '@/components/shared/CategoriesMosaicSection';
import CategoriesSection from '@/components/shared/CategoriesSection';
import CollectionShowcaseSection from '@/components/shared/CollectionShowcaseSection';
import AccessoriesSection from '@/components/shared/AccessoriesSection';
import NewsletterBannerSection from '@/components/shared/NewsletterBannerSection';
import FooterSection from '@/components/shared/FooterSection';

export default function HomePage() {
  return (
    <main>
      <Header />
      <HeroSection />
      <CategoriesMosaicSection />
      <CategoriesSection />
      <CollectionShowcaseSection />
      <AccessoriesSection />
      <NewsletterBannerSection />
      <FooterSection />
    </main>
  );
}
