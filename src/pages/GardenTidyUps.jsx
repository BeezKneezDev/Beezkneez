import ServicePage from '../components/ServicePage'

export default function GardenTidyUps() {
  return (
    <ServicePage
      title="Garden Tidy-Ups Rotorua"
      metaTitle="Garden Tidy-Ups Rotorua | Beezkneez Lawns & Property Care"
      metaDescription="Garden tidy-up services in Rotorua. Weed removal, garden bed maintenance, green waste removal and general clean-ups. Free quotes."
      description="From overgrown garden beds to general property clean-ups, I'll get your outdoor spaces looking tidy and well-maintained again."
      blurb={[
        "Got overgrown garden beds, weeds taking over, or a section that just needs a good clean-up? I'll get stuck in and sort it out. I handle everything from weed removal and garden bed maintenance to clearing overgrown areas and tidying up pathways.",
        "I can also take care of green waste removal so you don't have to worry about what to do with it all. Whether it's a one-off tidy-up or regular maintenance to keep things under control, I'm happy to help.",
        "I'm a local Rotorua operator who takes pride in doing a thorough job. I'll leave your property looking fresh and tidy, and I'll always clean up after myself. No job too messy.",
      ]}
      contentImage="/photos/mums_job/69d7f704-a0d4-4ac0-a300-3de48d14d381.jpeg"
      beforeAfterPairs={[
        {
          beforeSrc: '/photos/before-after/before-pathway-tidy-pukehangi-rotorua.jpg',
          afterSrc: '/photos/before-after/after-pathway-tidy-pukehangi-rotorua.jpg',
          beforeAlt: 'Overgrown side pathway before tidy-up in Pukehangi, Rotorua',
          afterAlt: 'Clean side pathway after tidy-up in Pukehangi, Rotorua',
          caption: 'Side pathway — overgrown ferns and weeds cleared, pavers cleaned up and garden bed tidied.',
        },
        {
          beforeSrc: '/photos/before-after/before-garden-bed-tidy-pukehangi-rotorua.jpg',
          afterSrc: '/photos/before-after/after-garden-bed-tidy-pukehangi-rotorua.jpg',
          beforeAlt: 'Overgrown garden bed before tidy-up in Pukehangi, Rotorua',
          afterAlt: 'Tidy garden bed after tidy-up in Pukehangi, Rotorua',
          caption: 'Garden bed — overgrown retaining wall area cleared, trimmed back and mulched.',
        },
      ]}
    />
  )
}
