import Image from "next/image";

type ThemedHeroImageProps = {
  alt: string;
  lightSrc: string;
  darkSrc: string;
  priority?: boolean;
  className?: string;
};

export default function ThemedHeroImage({
  alt,
  lightSrc,
  darkSrc,
  priority = true,
  className = "",
}: ThemedHeroImageProps) {
  const imageClassName = `object-cover ${className}`.trim();

  return (
    <>
      <Image
        src={lightSrc}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className={`${imageClassName} block dark:hidden`}
      />
      <Image
        src={darkSrc}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className={`${imageClassName} hidden dark:block`}
      />
    </>
  );
}
