import type { ImageSourcePropType } from 'react-native';
import type { BackgroundId } from '../domain/appearance';

// Static requires include the owner-approved originals in native and web exports.
export const backgroundAssets: Record<BackgroundId, ImageSourcePropType> = {
  'buttercup-morning-01-meadow-light': require('../../assets/backgrounds/buttercup-morning-01-meadow-light.png'),
  'buttercup-morning-02-sunlit-petals': require('../../assets/backgrounds/buttercup-morning-02-sunlit-petals.png'),
  'apricot-blossom-01-orchard-bloom': require('../../assets/backgrounds/apricot-blossom-01-orchard-bloom.png'),
  'apricot-blossom-02-apricot-dawn': require('../../assets/backgrounds/apricot-blossom-02-apricot-dawn.png'),
  'lavender-haze-01-lavender-whisper': require('../../assets/backgrounds/lavender-haze-01-lavender-whisper.png'),
  'lavender-haze-02-lilac-dusk': require('../../assets/backgrounds/lavender-haze-02-lilac-dusk.png'),
  'rosewater-01-petal-ripples': require('../../assets/backgrounds/rosewater-01-petal-ripples.png'),
  'rosewater-02-garden-reverie': require('../../assets/backgrounds/rosewater-02-garden-reverie.png'),
  'bluebell-mist-01-bluebell-garden': require('../../assets/backgrounds/bluebell-mist-01-bluebell-garden.png'),
  'bluebell-mist-02-morning-dew': require('../../assets/backgrounds/bluebell-mist-02-morning-dew.png'),
  'silver-moon-01-moonlit-magnolia': require('../../assets/backgrounds/silver-moon-01-moonlit-magnolia.png'),
  'silver-moon-02-moonveil': require('../../assets/backgrounds/silver-moon-02-moonveil.png'),
};
