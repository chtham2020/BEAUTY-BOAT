"use client";

import { useLanguagePreference } from "@/lib/language";
import { ChevronLeft, ChevronRight, MapPin, Phone, ReceiptText, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const brand = "美人舟";
const company = {
  zh: "福安",
  en: "FOOK ON",
};

const business = {
  phoneDisplay: "+65 6441 6390",
  phoneHref: "tel:+6564416390",
  address: "BLK 551 BEDOK NORTH AVE 1 #01-546 SINGAPORE 460551",
  paynow: "25339900M",
  paynowQr: "/images/paynow-qr.jpg",
  mapEmbed:
    "https://www.google.com/maps?q=BLK%20551%20BEDOK%20NORTH%20AVE%201%20%2301-546%20SINGAPORE%20460551&output=embed",
  mapLink:
    "https://www.google.com/maps/search/?api=1&query=BLK%20551%20BEDOK%20NORTH%20AVE%201%20%2301-546%20SINGAPORE%20460551",
};

const copy = {
  zh: {
    nav: {
      home: "主页",
      story: "品牌故事",
      products: "香料粉",
      order: "订购",
      cart: "购物车",
      contact: "联系",
    },
    heroKicker: "福安传统香料",
    heroTitle: "一味香气，留住老派好手艺。",
    heroBody:
      "美人舟延续传统粉料的温厚香气，从五香粉、胡椒粉到各式客制配方，为家常料理、熟食档与餐饮厨房调出稳定而有层次的味道。",
    heroCta: "询问客制粉料",
    paynowLabel: "PayNow UEN",
    carouselLabel: "轮播图片",
    slides: [
      {
        title: "泛舟美人的品牌意象",
        text: "以一幅明亮的古早画面作为记忆点，让香料的故事带一点诗意与现代感。",
      },
      {
        title: "五香粉的细致平衡",
        text: "辛、甘、暖、厚，在真实调配动作里呈现配方的层次与稳定。",
      },
      {
        title: "按用途调配",
        text: "从腌料、汤底到干拌粉，按料理习惯与用量调出合用的客制粉料。",
      },
    ],
    storyEyebrow: "从一匙粉开始",
    storyTitle: "传统不是怀旧摆设，而是每天都能用得上的味道。",
    storyBody:
      "美人舟的方向很朴素：把香料磨得细、配得准、用得顺。香气要先打开，入口要干净，留香要有余地。无论是家庭厨房的小罐，还是熟食档反复使用的大包粉料，都以稳定、耐煮、好搭配为核心。",
    productsEyebrow: "粉料系列",
    productsTitle: "熟悉的香气，做得更细。",
    products: [
      {
        name: "五香粉",
        english: "Five-Spice Powder",
        desc: "适合卤、炸、腌、焖，香气完整不抢味。",
      },
      {
        name: "胡椒粉",
        english: "Pepper Powder",
        desc: "辛香直接，适合汤品、肉类、熟食调味。",
      },
      {
        name: "客制粉料",
        english: "Custom Blends",
        desc: "按用途、口味和用量调配，适合餐饮与批量使用。",
      },
    ],
    customTitle: "需要自己的粉料比例？",
    customBody:
      "告诉我们用途、口味方向和使用场景，福安可以协助讨论适合的粉料组合。",
    orderCta: "前往订购",
    contactTitle: "联系与付款",
    addressLabel: "地址",
    phoneLabel: "电话",
    mapLabel: "店铺位置",
    mapLink: "打开地图导航",
    footer: "传统香料粉料 · 新加坡",
  },
  en: {
    nav: {
      home: "Home",
      story: "Story",
      products: "Powders",
      order: "Order",
      cart: "Shopping Cart",
      contact: "Contact",
    },
    heroKicker: "Traditional spices by FOOK ON",
    heroTitle: "Old-school spice craft, blended for everyday kitchens.",
    heroBody:
      "BEAUTY BOAT carries the warm depth of traditional spice powders, from five-spice and pepper powder to custom blends for home cooking, food stalls, and professional kitchens.",
    heroCta: "Ask About Custom Blends",
    paynowLabel: "PayNow UEN",
    carouselLabel: "Image carousel",
    slides: [
      {
        title: "The beauty-on-a-boat motif",
        text: "A bright heritage image gives the spice story a poetic, memorable, and modern identity.",
      },
      {
        title: "Balance in five-spice",
        text: "Warm, sweet, sharp, and rounded, shown through careful blending and reliable craft.",
      },
      {
        title: "Blended around your purpose",
        text: "From marinades and soup bases to dry seasoning, custom powders are matched to how you cook.",
      },
    ],
    storyEyebrow: "It starts with one spoonful",
    storyTitle: "Tradition is not decoration. It is flavour that works every day.",
    storyBody:
      "BEAUTY BOAT keeps the work simple and exact: finely milled spices, carefully balanced blends, and clean aroma. Whether packed for a home kitchen or prepared for repeated use in food service, the focus is consistency, depth, and ease of pairing.",
    productsEyebrow: "Powder Range",
    productsTitle: "Familiar aromas, blended with more care.",
    products: [
      {
        name: "五香粉",
        english: "Five-Spice Powder",
        desc: "For braising, frying, marinades, and stews, with a complete aroma that supports the dish.",
      },
      {
        name: "胡椒粉",
        english: "Pepper Powder",
        desc: "Clean peppery lift for soups, meats, cooked foods, and everyday seasoning.",
      },
      {
        name: "客制粉料",
        english: "Custom Blends",
        desc: "Made around usage, taste profile, and volume needs for food businesses and kitchens.",
      },
    ],
    customTitle: "Need your own powder ratio?",
    customBody:
      "Share the dish, flavour direction, and usage context. FOOK ON can help discuss a suitable blend.",
    orderCta: "Order",
    contactTitle: "Contact & Payment",
    addressLabel: "Address",
    phoneLabel: "Phone",
    mapLabel: "Shop Location",
    mapLink: "Open Map Directions",
    footer: "Traditional spice powders · Singapore",
  },
};

const images = [
  "/images/carousel-spice-shop.png",
  "/images/carousel-five-spice.png",
  "/images/carousel-custom-blends.png",
];

export default function Home() {
  const { language, setLanguage } = useLanguagePreference();
  const [activeSlide, setActiveSlide] = useState(0);
  const t = copy[language];
  const otherLanguage = language === "zh" ? "en" : "zh";

  const slide = useMemo(
    () => t.slides[activeSlide],
    [activeSlide, t.slides],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % images.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const moveSlide = (direction: -1 | 1) => {
    setActiveSlide((current) => (current + direction + images.length) % images.length);
  };

  return (
    <main className="site-shell">
      <a className="floating-cart" href="/cart" aria-label="Open cart">
        {t.nav.cart}
      </a>
      <header className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label={`${brand} ${company[language]}`}>
          <span>{brand}</span>
          <small>{company[language]}</small>
        </a>
        <nav className="nav-links">
          <a href="/">{t.nav.home}</a>
          <a href="#story">{t.nav.story}</a>
          <a href="#products">{t.nav.products}</a>
          <a href="/products">{t.nav.order}</a>
          <a href="#contact">{t.nav.contact}</a>
        </nav>
        <div className="topbar-actions">
          <a className="header-cart-link" href="/cart" aria-label={t.nav.cart}>
            <ShoppingCart size={17} aria-hidden="true" />
            <span>{t.nav.cart}</span>
          </a>
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage(otherLanguage)}
            aria-label={language === "zh" ? "Switch to English" : "切换到中文"}
          >
            <span className={language === "zh" ? "is-active" : ""}>中文</span>
            <span className={language === "en" ? "is-active" : ""}>EN</span>
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{t.heroKicker}</p>
          <h1>{brand}</h1>
          <h2>{t.heroTitle}</h2>
          <p>{t.heroBody}</p>
          <div className="hero-actions">
            <a className="primary-link" href={business.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              {t.heroCta}
            </a>
            <span>{business.phoneDisplay}</span>
          </div>
        </div>

        <section className="carousel" aria-label={t.carouselLabel}>
          <div className="carousel-frame">
            <img
              className="is-visible no-script-image"
              src={images[0]}
              alt={t.slides[0].title}
              loading="eager"
            />
            {images.map((src, index) => (
              <img
                key={src}
                className={index === activeSlide ? "is-visible" : ""}
                src={src}
                alt={t.slides[index].title}
                loading={index === 0 ? "eager" : "lazy"}
              />
            ))}
            <div className="slide-caption">
              <p>{slide.title}</p>
              <span>{slide.text}</span>
            </div>
            <button
              className="carousel-button previous"
              type="button"
              onClick={() => moveSlide(-1)}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              className="carousel-button next"
              type="button"
              onClick={() => moveSlide(1)}
              aria-label="Next image"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="slide-dots" aria-label="Carousel slide controls">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={index === activeSlide ? "is-active" : ""}
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="story" id="story">
        <div>
          <p className="eyebrow">{t.storyEyebrow}</p>
          <h2>{t.storyTitle}</h2>
        </div>
        <p>{t.storyBody}</p>
      </section>

      <section className="products" id="products">
        <div className="section-heading">
          <p className="eyebrow">{t.productsEyebrow}</p>
          <h2>{t.productsTitle}</h2>
        </div>
        <div className="product-grid">
          {t.products.map((product) => (
            <article className="product-card" key={product.english}>
              <span>{product.english}</span>
              <h3>{product.name}</h3>
              <p>{product.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="custom-cta">
        <div>
          <h2>{t.customTitle}</h2>
          <p>{t.customBody}</p>
        </div>
        <a className="primary-link dark" href={business.phoneHref}>
          <Phone size={18} aria-hidden="true" />
          {business.phoneDisplay}
        </a>
        <a className="primary-link dark" href="/products">
          {t.orderCta}
        </a>
      </section>

      <section className="contact" id="contact">
        <div className="section-heading">
          <p className="eyebrow">{company[language]}</p>
          <h2>{t.contactTitle}</h2>
        </div>
        <div className="contact-grid">
          <article>
            <MapPin size={22} aria-hidden="true" />
            <span>{t.addressLabel}</span>
            <p>{business.address}</p>
          </article>
          <article>
            <Phone size={22} aria-hidden="true" />
            <span>{t.phoneLabel}</span>
            <p>
              <a href={business.phoneHref}>{business.phoneDisplay}</a>
            </p>
          </article>
          <article>
            <ReceiptText size={22} aria-hidden="true" />
            <span>{t.paynowLabel}</span>
            <div className="paynow-details">
              <p>{business.paynow}</p>
              <img src={business.paynowQr} alt="FOOK ON PayNow SGQR code" />
            </div>
          </article>
        </div>
        <div className="map-card">
          <div className="map-copy">
            <span>{t.mapLabel}</span>
            <p>{business.address}</p>
            <a href={business.mapLink} target="_blank" rel="noreferrer">
              <MapPin size={18} aria-hidden="true" />
              {t.mapLink}
            </a>
          </div>
          <iframe
            title={t.mapLabel}
            src={business.mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <footer>
        <span>{brand}</span>
        <p>{t.footer}</p>
      </footer>
    </main>
  );
}
