import ServicePage from '../components/ServicePage'

export default function HedgeTrimming() {
  return (
    <ServicePage
      title="Hedge Trimming Rotorua"
      metaTitle="Hedge Trimming Rotorua | Beezkneez Lawns & Property Care"
      metaDescription="Professional hedge trimming in Rotorua. Hedge shaping, height reduction, overgrown hedge tidy-ups and regular maintenance. Free quotes."
      description="Keep your hedges looking sharp with professional trimming and shaping. From regular maintenance to tackling overgrown hedges, I'll get them sorted."
      blurb={[
        "Whether your hedges need a regular trim to keep them looking tidy or they've gotten well out of hand and need a serious cut back, I can help. I handle all types of hedges including privet, buxus, pittosporum and more.",
        "I'll shape your hedges up, reduce the height if needed, and clear away all the clippings when I'm done. If you've got hedges that haven't been touched in a while, no worries — I've tackled some seriously overgrown ones and brought them right back.",
        "I'm local to Rotorua and take pride in leaving things looking better than I found them. Reliable, friendly service with no surprises. Just get in touch and I'll come take a look.",
      ]}
      contentImage="/photos/glenholme/after-hedge-trim-backyard-glenholme.jpg"
      beforeAfterPairs={[
        {
          beforeSrc: '/photos/before-after/before-hedge-trim-glenholme-rotorua.jpg',
          afterSrc: '/photos/before-after/after-hedge-trim-glenholme-rotorua.jpg',
          beforeAlt: 'Overgrown hedge before trimming in Glenholme, Rotorua',
          afterAlt: 'Neatly trimmed hedge along pathway in Glenholme, Rotorua',
          caption: 'Hedge trim — very overgrown hedge reduced in height significantly, shaped up and ready for regular maintenance.',
        },
        {
          beforeSrc: '/photos/before-after/before-hedge-trim-lynmore-rotorua.jpg',
          afterSrc: '/photos/before-after/after-hedge-trim-lynmore-rotorua.jpg',
          beforeAlt: 'Overgrown hedge before trimming in Lynmore, Rotorua',
          afterAlt: 'Neatly trimmed hedge after shaping in Lynmore, Rotorua',
          caption: 'Hedge trim — overgrown front hedge shaped and tidied, clippings cleared.',
        },
      ]}
    />
  )
}
