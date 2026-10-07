"use client";
import { useEffect } from "react";
import Image from "next/image";
import useAuthStore from "@/lib/authStore";

function Carousel() {
  const images = [
    "/one.jpg",
    "/two.jpg",
    "/three.jpg",
    "/four.jpg",
    "/five.jpg",
    "/six.jpg",
    "/seven.jpg",
    "/eight.jpg",
    "/nine.jpg",
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000); // 3 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-80 overflow-hidden rounded-2xl group">
      {images.map((src, idx) => (
        <Image
          key={src}
          src={src}
          alt={`Slide ${idx + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 700px"
          className={`absolute top-0 left-0 w-full h-80 object-cover transition-opacity duration-700 ${
            idx === current ? "opacity-100 z-10" : "opacity-0 z-0"
          } group-hover:scale-105`}
          style={{ transitionProperty: "opacity, transform" }}
          priority={idx === 0}
        />
      ))}
      {/* Optional: Dots indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {images.map((_, idx) => (
          <span
            key={idx}
            className={`block w-2 h-2 rounded-full ${
              idx === current ? "bg-yellow-400" : "bg-white/40"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  Star,
  Search,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarqueeNotice from "@/components/MarqueeNotice";

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [showAdmissions, setShowAdmissions] = useState(false);
  const { logout, clearAuth } = useAuthStore();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { getSetting } = await import("@/lib/settingsService");
        const isVisible = await getSetting("showAdmissions", false);
        setShowAdmissions(isVisible);
      } catch (error) {
        console.error("Error fetching admission settings:", error);
      }
    };
    fetchSettings();

    const clearAllAuth = async () => {
      try {
        localStorage.clear();

        sessionStorage.clear();

        await logout();

        clearAuth();

        console.log("✅ All authentication data cleared on home page visit");
      } catch (error) {
        console.error("❌ Error clearing authentication:", error);
        localStorage.clear();
        sessionStorage.clear();
        clearAuth();
      }
    };

    clearAllAuth();
  }, [logout, clearAuth]);

  const features = [
    {
      icon: GraduationCap,
      title: "Student Management",
      description: "Comprehensive student admission and management system",
    },
    {
      icon: Users,
      title: "Multi-Role Access",
      description: "Role-based access for students, teachers, and Sadars",
    },
    {
      icon: BookOpen,
      title: "Learning Materials",
      description: "Digital content management and distribution",
    },
    {
      icon: Award,
      title: "Islamic Excellence",
      description: "Focused on Islamic education and values",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header />

      {/* Marquee Notice */}
      <MarqueeNotice />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 text-white py-12 px-4 sm:px-8">
        {/* Background Elements - Simplified for mobile */}
        {/* <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-32 w-48 h-48 bg-yellow-300 rounded-full blur-3xl opacity-15 animate-pulse delay-1000 hidden sm:block"></div>
          <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-yellow-500 rounded-full blur-3xl opacity-10 animate-pulse delay-2000 hidden sm:block"></div>
        </div> */}

        <div className="container w-[90vw] mx-auto  px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
            {/* Content */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="inline-flex items-center</div> px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-yellow-400/20 border border-yellow-400/30 backdrop-blur-sm ">
                  <Star className="w-4 h-4 text-white mr-2" />
                  <span className="text-white text-xs sm:text-sm font-bold">
                    Excellence in Islamic Education
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">
                  <span className="block bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
                    Dakshina Kerala
                  </span>
                  <span className="block text-yellow-400 text-3xl sm:text-4xl md:text-5xl">
                    Islam Matha
                  </span>
                  <span className="block bg-gradient-to-r from-teal-100 to-white bg-clip-text text-transparent text-2xl sm:text-3xl md:text-4xl">
                    Vidyabhyasa Board
                  </span>
                </h1>
              </div>

              <p className="text-base sm:text-xl text-teal-100 leading-relaxed max-w-xl">
                قال النَّبِيُّ ﷺ : مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ
                عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                {showAdmissions && (
                  <button
                    className="group bg-yellow-400 hover:bg-yellow-500 text-teal-800 font-bold px-6 py-3 sm:px-8 sm:py-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center text-sm sm:text-base"
                    onClick={() => (window.location.href = "/admission/form")}
                  >
                    <GraduationCap className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    Begin Your Journey
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                <button className="group border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm px-6 py-3 sm:px-8 sm:py-4 rounded-xl transition-all duration-300 flex items-center justify-center text-sm sm:text-base">
                  <BookOpen className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Explore Features
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Stats - Stacked on mobile */}
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-8 pt-8 sm:pt-12 border-t border-white/20">
                {[
                  { icon: Users, value: "100k+", label: "Active Students" },
                  { icon: BookOpen, value: "10k+", label: "Expert Teachers" },
                  { icon: Award, value: "58+", label: "Mekhalas" },
                ].map((stat, index) => (
                  <div key={index} className="text-center group cursor-pointer">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center mx-auto mb-1 sm:mb-2 group-hover:bg-yellow-400/30 transition-colors">
                      <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="text-xl sm:text-3xl font-bold text-yellow-400 group-hover:scale-110 transition-transform">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-teal-200">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image - Hidden on small mobile */}
            <div className="relative hidden sm:block">
              <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl p-3 border border-white/20 shadow-2xl">
                <div className="relative overflow-hidden rounded-2xl group">
                  <Carousel />
                  {/* 
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-900/80 via-transparent to-transparent"></div> */}

                  {/* <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                    <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium">Certified</span>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-16 sm:py-24 bg-gray-50 relative w-[90vw] mx-auto"
      >
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-teal-100 text-teal-700 text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-teal-200">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Premium Learning Experience
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight">
              Revolutionary
              <span className="block text-teal-600">Learning Platform</span>
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ
            </p>
          </div>

          {/* Features - Stacked on mobile */}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center mb-12 sm:mb-20">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-2xl sm:text-4xl font-bold text-gray-900">
                  Interactive Learning Methods
                </h3>
                <p className="text-sm sm:text-lg text-gray-600 leading-relaxed">
                  Discover innovative teaching methodologies that seamlessly
                  blend traditional Islamic wisdom with modern educational
                  technology.
                </p>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {[
                  {
                    icon: BookOpen,
                    title: "Immersive Content",
                    desc: "Engage with multimedia lessons and interactive exercises",
                    color: "teal",
                  },
                  {
                    icon: Users,
                    title: "Collaborative Learning",
                    desc: "Connect with peers and expert instructors worldwide",
                    color: "yellow",
                  },
                  {
                    icon: Award,
                    title: "Achievement Tracking",
                    desc: "Monitor progress with certificates and milestones",
                    color: "green",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-4 sm:space-x-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-gray-100 hover:border-${item.color}-200 bg-white hover:bg-${item.color}-50/50 transition-all duration-300 cursor-pointer group`}
                    onMouseEnter={() => setActiveFeature(index)}
                  >
                    <div
                      className={`w-10 h-10 sm:w-14 sm:h-14 bg-${item.color}-100 group-hover:bg-${item.color}-200 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-colors`}
                    >
                      <item.icon
                        className={`h-5 w-5 sm:h-7 sm:w-7 text-${item.color}-600`}
                      />
                    </div>
                    <div>
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-teal-700 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-base text-gray-600 group-hover:text-gray-700 transition-colors">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Card - Full width on mobile */}
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-teal-200/50 to-yellow-200/50 rounded-xl sm:rounded-3xl blur-xl"></div>

              <div className="relative bg-white rounded-xl sm:rounded-3xl p-6 sm:p-10 shadow-lg sm:shadow-2xl border border-gray-100">
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                      <GraduationCap className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
                      Enhance Your Skills
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-lg">
                      Advanced methodologies for comprehensive learning
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    {[
                      {
                        value: "95%",
                        label: "Completion",
                        color: "bg-teal-50 text-teal-600 border-teal-200",
                      },
                      {
                        value: "4.9",
                        label: "Rating",
                        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
                      },
                      {
                        value: "50+",
                        label: "Courses",
                        color: "bg-green-50 text-green-600 border-green-200",
                      },
                      {
                        value: "24/7",
                        label: "Support",
                        color: "bg-purple-50 text-purple-600 border-purple-200",
                      },
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className={`${stat.color} rounded-lg sm:rounded-2xl p-3 sm:p-6 text-center border-2 hover:scale-105 transition-transform cursor-pointer`}
                      >
                        <div className="text-xl sm:text-3xl font-bold mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs sm:text-sm font-medium opacity-80">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Madrasa Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-gray-900 via-teal-900  to-gray-900 text-white relative overflow-hidden px-4 sm:px-8 ">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-20 items-center">
            {/* Content */}
            <div className="space-y-6 sm:space-y-10">
              <div className="space-y-4 sm:space-y-8">
                <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-yellow-400/20 border border-yellow-400/30 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-white  text-xs sm:text-sm font-bold tracking-wide">
                    REVOLUTIONARY EDUCATION
                  </span>
                </div>

                <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight">
                  <span className="block text-yellow-400 drop-shadow-lg">
                    Smart
                  </span>
                  <span className="block text-white drop-shadow-lg">
                    Madrasa
                  </span>
                  <span className="block text-xl sm:text-2xl font-normal text-teal-300 mt-2 sm:mt-4">
                    Initiative
                  </span>
                </h2>

                <p className="text-base sm:text-xl text-gray-300 leading-relaxed">
                  Transforming education across{" "}
                  <span className="text-yellow-400 font-bold text-xl sm:text-2xl">
                    3000+ madrasas
                  </span>{" "}
                  through innovative digital content and comprehensive teacher
                  training programs.
                </p>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {[
                  "Digital content distribution across all institutions",
                  "Comprehensive teacher training and development",
                  "Interactive multimedia learning experiences",
                  "Real-time progress tracking and analytics",
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 sm:space-x-4 group"
                  >
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full group-hover:scale-150 transition-transform"></div>
                    <span className="text-gray-300 group-hover:text-white transition-colors text-sm sm:text-lg">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <button className="bg-gradient-to-r from-yellow-400/80 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold px-6 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center text-sm sm:text-base">
                Learn More
                <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Visual Element - Hidden on small mobile */}
            <div className="relative hidden sm:block">
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-yellow-400/10 to-teal-400/10 rounded-xl sm:rounded-3xl blur-xl sm:blur-2xl"></div>

              <div className="relative bg-white/5 backdrop-blur-sm sm:backdrop-blur-lg rounded-xl sm:rounded-3xl p-6 sm:p-10 border border-white/10 shadow-lg sm:shadow-2xl">
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl sm:shadow-2xl">
                      <span className="text-gray-900 font-bold text-2xl sm:text-4xl">
                        <Image
                          src="/logo.png"
                          alt="logo"
                          width={64}
                          height={64}
                          className="p-2"
                        />
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                      Digital Transformation
                    </h3>
                    <p className="text-teal-200 text-sm sm:text-base">
                      Modernizing traditional Islamic education
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    {[
                      { value: "3000+", label: "Madrasas", icon: "🏛️" },
                      { value: "100%", label: "Digital", icon: "💻" },
                      { value: "Smart", label: "Learning", icon: "🧠" },
                      { value: "24/7", label: "Access", icon: "🌐" },
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className="bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl p-3 sm:p-6 text-center backdrop-blur-sm border border-white/20 transition-all hover:scale-105 cursor-pointer group"
                      >
                        <div className="text-xl sm:text-3xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                          {stat.icon}
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-400 mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs text-teal-200 font-medium">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admission CTA Section */}
      {showAdmissions && (
        <section
          id="admission"
          className="py-12 w-full bg-gradient-to-br from-gray-50 to-white relative"
        >
          <div className=" mx-auto px-4">
            <div className="max-w-full sm:max-w-[90%] mx-auto">
              <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl relative">
                <div className="relative z-10 p-6 sm:p-12 lg:p-16">
                  <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    <div className="space-y-6 sm:space-y-8">
                      <div className="space-y-4 sm:space-y-6">
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight text-white">
                          Admission Open
                          <span className="block text-yellow-400">
                            2025-2026
                          </span>
                        </h2>

                        <p className="text-base sm:text-xl text-teal-100 leading-relaxed">
                          Join thousands of students in our revolutionary Smart
                          Madrasa program. Transform your future with quality
                          Islamic education.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <button
                          className="bg-yellow-400 hover:bg-yellow-500 text-teal-800 font-bold px-6 py-3 sm:px-10 sm:py-4 rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group text-sm sm:text-base"
                          onClick={() =>
                            (window.location.href = "/admission/form")
                          }
                        >
                          <GraduationCap className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="flex items-center space-x-3 sm:space-x-4 bg-white/10 rounded-lg sm:rounded-xl px-4 py-3 sm:px-8 sm:py-4 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-400 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Phone className="h-4 w-4 sm:h-6 sm:w-6 text-teal-800" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-teal-200">
                              Call us now
                            </div>
                            <div className="text-sm sm:text-md font-bold text-white">
                              +91 9447300188 <br />
                              +91 9447724432
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trust Indicators - Stacked on mobile */}
                    <div className="space-y-4 sm:space-y-8">
                      <div className="grid grid-cols-1 gap-3 sm:gap-6">
                        {[
                          {
                            icon: CheckCircle,
                            title: "100% Placement Rate",
                            desc: "All graduates placed successfully",
                            color: "green",
                          },
                          {
                            icon: Star,
                            title: "Minimal Registration Fee",
                            desc: "Completely free admission process",
                            color: "yellow",
                          },
                          {
                            icon: Award,
                            title: "24/7 Student Support",
                            desc: "Round the clock assistance",
                            color: "blue",
                          },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center space-x-3 sm:space-x-4 bg-white/10 rounded-lg sm:rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all hover:scale-[1.02]`}
                          >
                            <div
                              className={`w-8 h-8 sm:w-14 sm:h-14 bg-${item.color}-400/20 rounded-lg sm:rounded-xl flex items-center justify-center`}
                            >
                              <item.icon
                                className={`h-4 w-4 sm:h-7 sm:w-7 text-${item.color}-400`}
                              />
                            </div>
                            <div>
                              <div className="text-sm sm:text-lg font-bold text-white">
                                {item.title}
                              </div>
                              <div className="text-xs sm:text-sm text-teal-200">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Access Section */}
      <section className="py-16 sm:py-24 bg-white relative overflow-hidden px-4 sm:px-8">
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-teal-100 text-teal-700 text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-teal-200">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Access Portal
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight ">
              Choose Your&nbsp;
              <span className="text-teal-600">Portal</span>
            </h2>

            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Select your role to access personalized features and tools
              designed for your needs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: GraduationCap,
                title: "Student",
                href: "/auth/login/student",
                color: "blue",
              },
              {
                icon: BookOpen,
                title: "Teacher",
                href: "/auth/login/teacher",
                color: "green",
              },
              {
                icon: Users,
                title: "Sadar",
                href: "/auth/login/madarsa-admin",
                color: "purple",
              },
              {
                icon: Search,
                title: "Inspector (Thaftheesh)",
                href: "/auth/login/inspector",
                color: "teal",
              },
              {
                icon: Award,
                title: "Central Admin",
                href: "/auth/login/admin",
                color: "red",
              },
              {
                icon: Star,
                title: "Mekhala Portal / Convener Portal",
                href: "/auth/login/mekhala",
                color: "yellow",
              },
              {
                icon: CheckCircle,
                title: "Exam Board",
                href: "/auth/login/pariksha-board-convener",
                color: "orange",
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="hover:shadow-md sm:hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-${item.color}-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:bg-${item.color}-200 transition-colors`}
                  >
                    <item.icon
                      className={`h-5 w-5 sm:h-6 sm:w-6 text-${item.color}-600`}
                    />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">
                    {item.title}
                  </h3>
                  <Link href={item.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                    >
                      Login
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
