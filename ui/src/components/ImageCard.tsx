/* === ImageCard component === */
import type { ImageResult } from '../types';
import styles from './ImageCard.module.css';

interface Props {
  image: ImageResult;
  index: number;
}

export default function ImageCard({ image, index }: Props) {
  return (
    <a
      href={image.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      style={{ animationDelay: `${index * 40}ms` }}
      aria-label={image.altText || 'Image result'}
    >
      <div className={styles.imgWrapper}>
        <img
          src={image.url}
          alt={image.altText}
          className={styles.img}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23505a72" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
          }}
        />
      </div>
      {image.altText && (
        <p className={styles.caption}>{image.altText}</p>
      )}
    </a>
  );
}
