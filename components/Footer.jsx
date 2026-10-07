import Image from "next/image";
import React from "react";
import { Facebook, Twitter, Instagram } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-teal-900 text-white py-8 sm:py-10 md:py-12">
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 sm:gap-10 md:gap-12 lg:gap-16 border-b border-teal-700 pb-6 sm:pb-8 md:pb-10">
          {/* Logo & Description */}
          <div className="flex flex-col items-center lg:items-start mb-6 lg:mb-0 min-w-[220px]">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-200 to-white rounded-lg flex items-center justify-center shadow-lg mb-3 sm:mb-4">
              <Image
                src={"/logo.png"}
                alt="Logo"
                width={48}
                height={48}
                className="w-full h-full rounded-lg object-cover"
              />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">DKJU</h3>
            <p className="text-teal-200 max-w-xs mb-3 sm:mb-4 text-sm sm:text-base text-center lg:text-left leading-relaxed">
              Smart Islamic Education Platform
            </p>
            {/* Social Links */}
            <div className="flex space-x-4 sm:space-x-5 ">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="hover:text-yellow-400 transition-colors p-2 hover:bg-teal-800 rounded-full"
              >
                <Facebook size={20} className="sm:w-6 sm:h-6" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="hover:text-yellow-400 transition-colors p-2 hover:bg-teal-800 rounded-full"
              >
                <Twitter size={20} className="sm:w-6 sm:h-6" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-yellow-400 transition-colors p-2 hover:bg-teal-800 rounded-full"
              >
                <Instagram size={20} className="sm:w-6 sm:h-6" />
              </a>
            </div>
            <p className="text-teal-200 text-sm sm:text-base  font-medium mt-4">
              Contact Technical Support:{" "}
              <a
                href="tel:+918891177850"
                className="hover:text-yellow-400 transition-colors underline"
              >
                8891177850
              </a>
            </p>
          </div>
          {/* Resources */}
          <div className="flex flex-col items-center lg:items-start min-w-[150px]">
            <h4 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">
              Resources
            </h4>
            <ul className="space-y-2 text-center lg:text-left">
              <li>
                <a
                  href="/brand-guide"
                  className="text-teal-200 text-sm sm:text-base hover:text-yellow-400 transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                  Brand Style Guide
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-teal-200 text-sm sm:text-base hover:text-yellow-400 transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-teal-200 text-sm sm:text-base hover:text-yellow-400 transition-colors inline-flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Address & Map */}
          <div className="flex flex-col items-center lg:items-start gap-4 sm:gap-5 min-w-[220px] w-full lg:w-auto">
            <div className="text-center lg:text-left">
              <h4 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                Address
              </h4>
              <p className="text-teal-200 text-sm sm:text-base max-w-xs lg:max-w-sm leading-relaxed">
                Dakshina Kerala Islam Matha Vidyabhyasa Board, Jonakappuram
                <br /> Pallithottam. P. O Kollam - 691006
              </p>
            </div>
            <div className="w-full max-w-xs sm:max-w-sm lg:max-w-xs h-28 sm:h-32 md:h-36 lg:h-32 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15767.869140390987!2d76.5595954871582!3d8.882633599999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b05fc43e92211ef%3A0x31ef4ce6cf4f5946!2sJonakappuram%20Juma%20Masjid%20Kollam!5e0!3m2!1sen!2sin!4v1755028886875!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Location Map"
              ></iframe>
            </div>
          </div>
        </div>
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-teal-300 text-xs sm:text-sm">
            © {new Date().getFullYear()} DKJU IT Division. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
