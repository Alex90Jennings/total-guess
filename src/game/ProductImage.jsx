import React from 'react';

/**
 * A product photograph.
 *
 * Three sources, in order of how quickly they arrive:
 *
 *   /items/<code>.jpg    the photographed catalogue, deployed with the app
 *   /off/<barcode>.jpg   catalogue products, copied onto our own CDN
 *   the original URL     only if that copy is missing
 *
 * The third is the slow one. Open Food Facts' server takes about five seconds
 * to start sending a 25 kB picture, and most of a basket comes from there, so
 * the copies are the difference between a game that feels instant and one that
 * feels broken. The fallback stays because a missing copy should cost a delay,
 * not a blank space.
 */
function ProductImage({ item, currentImage, description, attribution }) {
    const image = currentImage ?? item?.image ?? '';
    const isRemote = /^https?:\/\//.test(image);
    const barcode = item?._id?.startsWith('off:') ? item._id.slice(4) : null;

    const source = !isRemote ? `/items/${image}.jpg`
        : barcode ? `/off/${barcode}.jpg`
        : image;

    const onError = (event) => {
        // The mirrored copy is missing: fall back to the original, once.
        if (barcode && !event.target.dataset.retried && isRemote) {
            event.target.dataset.retried = 'true';
            event.target.src = image;
            return;
        }
        event.target.src = '/icons/not-found.png';
    };

    return (
        <>
            <img
                key={image}
                src={source}
                alt={description || 'product'}
                className="play-image"
                width="520"
                height="520"
                onError={onError}
            />
            {attribution && <p className="play-image-credit">{attribution}</p>}
        </>
    );
}

export default ProductImage;
