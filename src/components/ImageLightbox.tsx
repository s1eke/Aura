'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

interface ImageLightboxProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const navigate = useNavigate();

    // Handle back button behavior
    useEffect(() => {
        // Push a new history state when the lightbox opens
        window.history.pushState({ lightboxOpen: true }, '', window.location.href);

        const handlePopState = () => {
            // When the user navigates back (popstate), close the lightbox
            // Any popstate event means we've left the lightbox state
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // We don't automatically go back on unmount because:
            // 1. If unmounted via back button (popstate), we are already back.
            // 2. If unmounted via manual close, we handle invalidating the history entry in the close handler.
        };
    }, [onClose]);

    const handleClose = () => {
        // When manually closing, we need to go back in history to remove the state we pushed
        navigate(-1);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleClose();
        } else if (e.key === 'ArrowLeft') {
            handlePrevious();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        }
    };

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={handleClose}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            // Auto focus to capture keyboard events
            ref={(el) => el?.focus()}
        >
            {/* Close Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                }}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                }}
            >
                <FontAwesomeIcon icon={faTimes} />
            </button>

            {/* Image */}
            <div style={{
                position: 'relative',
                maxWidth: '90%',
                maxHeight: '90%',
                width: 'auto',
                height: 'auto'
            }}>
                <Image
                    src={images[currentIndex]}
                    alt="Full size"
                    width={1920}
                    height={1080}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </div>

            {/* Navigation Buttons (only show if multiple images) */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrevious();
                        }}
                        style={{
                            position: 'absolute',
                            left: '20px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            color: 'white',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        style={{
                            position: 'absolute',
                            right: '20px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            color: 'white',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>

                    {/* Image Counter */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                        }}
                    >
                        {currentIndex + 1} / {images.length}
                    </div>
                </>
            )}
        </div>,
        document.body
    );
}
