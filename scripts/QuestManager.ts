import { OColor } from '_OColor';
import { OUtils } from '_OUtils';
import { OWings } from '_OWings';
import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';
import { Color } from 'horizon/core';

class QuestManager extends hz.Component<typeof QuestManager> {
  static propsDefinition = {
    popupPosition: { type: hz.PropTypes.Vec3, default: new hz.Vec3(0, 10, 0) },
    fontSize: { type: hz.PropTypes.Number, default: 10 },
    charPerLine: { type: hz.PropTypes.Number, default: 10 },
  };

  start() {
    const wrapper = new OWrapper(this);
    const sound = OUtils.getChildWithTag(this.entity, 'Sound')!.as(hz.AudioGizmo);
    wrapper.onPlayerEnter((player) => {
      const sub = this.connectCodeBlockEvent(this.entity, hz.CodeBlockEvents.OnAchievementComplete, (player: hz.Player, scriptID: string) => { 
        // player.showToastMessage(scriptID);
        const text = this.formatParagraph(this.getText(scriptID), this.props.charPerLine)
        this.world.ui.showPopupForPlayer(player, text, 4, {
          position: this.props.popupPosition,
          fontSize: this.props.fontSize,
          fontColor: OColor.Orange,
          backgroundColor: Color.white,
          playSound: false,
          showTimer: false,
        });
        sound.play({ fade: 1, players : [player] });
        // hz.InWorldQuest.launchQuestDetailsPanel(player, this.questID);
        // const achivement = this.entity.as(hz.AchievementsGizmo);
        // achivement.displayAchievements([this.questID])
      });
    })    
  }

    private getText(scriptID: string): string {
    if (scriptID == 'QuestBuildHive')
      return 'The hive stands tall, your colony finally has a home!'
    if (scriptID == 'QuestExpandTerrain')
      return 'Your island flourishes, stretching farther than ever before!'
    if (scriptID == 'QuestBeeCount')
      return 'The swarm grows stronger, your buzzing army is complete!'
    if (scriptID == 'QuestHoney')
      return 'Your hive glows with golden abundance. Sweet success!'
    if (scriptID == 'QuestRain')
      return 'The flowers bloom once more — your rains bring life to the land.'
    return 'missing';
  }

  private getTextDescription(scriptID: string): string {
    if (scriptID == 'QuestBuildHive')
      return 'Construct your very first hive and give your colony a home. Bees need a heart to return to.'
    if (scriptID == 'QuestExpandTerrain')
      return 'Grow your island! Expand thirty terrain tiles to unlock new fertile areas for flowers and hives.'
    if (scriptID == 'QuestBeeCount')
      return 'Strengthen your swarm. Recruit or hatch ten bees to increase your colony’s harvesting power.'
    if (scriptID == 'QuestHoney')
      return 'Store up a sweet reserve of honey. True prosperity begins with a full hive.'
    if (scriptID == 'QuestRain')
      return 'Call down rain twenty times to revive the flowers. Let the world bloom again beneath your clouds.'
    return 'missing';
  }

   public formatParagraph(text: string, maxLineLength: number = 40): string {
    const nobreakBefore = [';', ':', ')', '»']; // removed '?' and '!'
    const nobreakAfter = ['(', '«'];

    text = text.replace(/ ?([;:»])/g, '\u00A0$1');
    text = text.replace(/([«(]) ?/g, '$1\u00A0');
    text = text.replace(/[\u00A0 ]+([.!?])/g, '$1');

    const words = text.split(/\s+/);
    let lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const potentialLine = currentLine.length > 0 ? currentLine + ' ' + word : word;
      const lastWord = currentLine.split(' ').pop() || '';
      if ((nobreakBefore.includes(word[0]) && currentLine.length > 0) ||
          (nobreakAfter.includes(lastWord) && currentLine.length > 0)) {
        currentLine += '\u00A0' + word;
      } else if (potentialLine.length <= maxLineLength) {
        currentLine = potentialLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) lines.push(currentLine);
    return lines.join('\n');
  }
}
hz.Component.register(QuestManager);