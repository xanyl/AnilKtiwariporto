import { motion as m } from 'framer-motion';

type Props = {
  className?: string;
  children: JSX.Element | JSX.Element[];
  type?: 'left' | 'right' | 'bottom';
  delay?: number;
};

export default function MotionPage({ children, className, type, delay }: Props) {
  return (
    <m.div variants={type === 'bottom' ? bottom : type === 'right' ? right : left} initial="hidden" animate="enter" exit="exit" transition={{ ease: 'easeInOut', duration: 0.75, delay }} className={className}>
      {children}
    </m.div>
  );
}

const left = {
  hidden: { opacity: 0, x: -40, y: 0 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: 0, y: 40 },
};
const right = {
  hidden: { opacity: 0, x: 40, y: 0 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: 0, y: 40 },
};
const bottom = {
  hidden: { opacity: 0, x: 0, y: 40 },
  enter: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -40, y: 0 },
};
