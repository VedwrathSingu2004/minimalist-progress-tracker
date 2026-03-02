import localFont from 'next/font/local'

export const londonFontFamily = localFont({
  src: [
    {
      path: '../fonts/London/london_regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/London/london_bold.ttf',
      weight: '700',
      style: 'bold',
    },
    {
      path: '../fonts/London/london_light.ttf',
      weight: '300',
      style: 'light',
    },
  ],
  display: 'swap',
  variable: '--font-london',
})

export const qualyFontFamily = localFont({
  src: [
    {
      path: '../fonts/Qualy/qualy.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-london',
})