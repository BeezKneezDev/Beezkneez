import ServicePage from '../components/ServicePage'

export default function LawnMowing() {
  return (
    <ServicePage
      title="Lawn Mowing Rotorua"
      metaTitle="Lawn Mowing Rotorua | Beezkneez Lawns & Property Care"
      metaDescription="Reliable lawn mowing service in Rotorua. Regular fortnightly or weekly mowing, one-off cuts, edge trimming and clippings removal. Free quotes."
      description="Regular, reliable lawn mowing for residential sections across Rotorua. Whether it's a fortnightly tidy-up or a one-off mow, I'll keep your lawn looking sharp."
      blurb={[
        "I offer regular fortnightly and weekly mowing for small to medium residential sections across Rotorua. Whether you need a consistent schedule to keep things tidy or a one-off mow to get on top of an overgrown lawn, I've got you covered.",
        "I'll also tidy up around your paths, driveways and garden beds with the weed eater when it needs doing, and all clippings get cleared so your property looks tidy when I'm done. No mess left behind.",
        "I'm a reliable, local operator who turns up when I say I will. I take pride in doing a proper job every time, and I'll treat your property like it's my own. Just honest, friendly service you can count on.",
      ]}
      contentImage="/photos/before-after/after-backyard-mow-rotorua.jpg"
      beforeAfterPairs={[
        {
          beforeSrc: '/photos/before-after/before-backyard-mow-rotorua.jpg',
          afterSrc: '/photos/before-after/after-backyard-mow-rotorua.jpg',
          beforeAlt: 'Backyard lawn before mowing in Rotorua',
          afterAlt: 'Freshly mowed backyard lawn with stripes in Rotorua',
          caption: 'Fortnightly mow — regular backyard tidy-up with a full cut, edge trim and clean-up.',
        },
        {
          beforeSrc: '/photos/before-after/before-lawn-mow-hillcrest-rotorua.jpg',
          afterSrc: '/photos/before-after/after-lawn-mow-hillcrest-rotorua.jpg',
          beforeAlt: 'Backyard lawn before mowing in Hillcrest, Rotorua',
          afterAlt: 'Backyard lawn after mowing in Hillcrest, Rotorua',
          beforeOffset: { y: '20px' },
          afterOffset: { y: '-10px' },
          caption: 'Backyard mow — gave this lawn a good tidy up, cleared the debris and got the edges looking sharp.',
        },
      ]}
    />
  )
}
