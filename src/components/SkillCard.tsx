import { Text, Tooltip } from "@mantine/core";
import MotionPage from "./MotionPage";
import getImgUrl from "../../public/assets/getImgUrl";
import { Skill } from "../data/skills/skill";

export default function SkillCard({
  data,
  delay,
}: {
  data: Skill;
  delay: number;
}) {
  return (
    <MotionPage type="bottom" delay={delay}>
      <Tooltip label={data.name} color="gray" withArrow position="bottom">
        <div
          key={data.name}
          className="grid place-items-center w-full sm:w-[279px] h-[148px] 
        p-6 shadow-md rounded-xl "
        >
          {data.icon ? (
            <img
              src={getImgUrl(data.icon)}
              alt={data.name}
              title={data.name}
              width={100}
              height={100}
            />
          ) : (
            <Text align="center" weight={600} size="lg">
              {data.name}
            </Text>
          )}
        </div>
      </Tooltip>
    </MotionPage>
  );
}
