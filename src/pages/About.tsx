import { Box, Center, Grid, List, Text, Timeline } from "@mantine/core";
import MotionPage from "../components/MotionPage";
import useTheme from "../globalState/theme";
import getImgUrl from "../../public/assets/getImgUrl";
import { ThemeState } from "../components/templates/NavBar";

export default function About() {
  const theme = useTheme((state) => (state as ThemeState).theme);

  return (
    <div className="py-7 px-5 sm:px-0">
      <Grid>
        <Grid.Col xs={12} md={3} orderXs={1} orderMd={2}>
          <MotionPage type="bottom">
            <Center sx={{ paddingTop: '1.5rem' }}>
              <img src={getImgUrl('anil.JPG')} alt="akbaroke" width={150} height={150} className="rounded-full shadow-lg dark:shadow-gray-700/50 mt-5" />
            </Center>
          </MotionPage>
        </Grid.Col>
        <Grid.Col xs={12} md={9} orderXs={2} orderMd={1}>
          <MotionPage>
            <Text size={42} weight="bold">
              About Me
            </Text>

            <Text component="span" variant="gradient" size={26} weight="bold" gradient={{ from: 'indigo', to: `${theme === 'dark' ? 'gray' : 'black'}`, deg: 45 }}>
              Anil K Tiwari
            </Text>
            <Text size="md" my="sm">
              Hi everyone, my name is Anil K Tiwari. I am a Frontend Web Developer, Computer Engineer, AI enthusiast and Computer Science Student.
            </Text>
            <Text size="md" my="sm">
              I live in Pokhara, Nepal. I was born in Pokhara, June 21 1999. I am 24 years old. I am a Computer Engineer Student from Pokhara University .
            </Text>
            {/* <Text size="md" my="sm">
              Coding has been my passion and hobby since I was 18 years old, and I have loved computers since I was a kid. Besides coding, I like listening to music. I also like to play games. My favorite genre is First Person Shooters. I
              spend a lot of time on TikTok sharing demo videos of apps.
            </Text> */}
          </MotionPage>
        </Grid.Col>
      </Grid>
      <Box mt="md">
        <MotionPage delay={0.5}>
          <Text size={42} weight="bold">
            Education
          </Text>
          <Timeline active={1} mt="sm">
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  University
                </Text>
              }>
              <Text className="dark:text-gray-400">Pokhara University, SOE</Text>
              <Text size="md" className="dark:text-gray-400">
                Computer Engineering (CGPA: 3.41)
              </Text>
              <Text size="sm" color="dimmed" mt={4} className="dark:text-gray-400">
                2018 - 2023
              </Text>
            </Timeline.Item>
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  High School
                </Text>
              }>
              <Text className="dark:text-gray-400">Diamond Higher Secondary School</Text>
              <Text size="md" className="dark:text-gray-400">
                Mathematics & Physics
              </Text>
              <Text size="sm" color="dimmed" mt={4} className="dark:text-gray-400">
                2016 - 2018
              </Text>
            </Timeline.Item>
          </Timeline>
        </MotionPage>
      </Box>
      <Box mt="md">
        <MotionPage delay={1}>
          <Text size={42} weight="bold">
            Work Experience
          </Text>
          <Timeline active={0} mt="sm">
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  Frontend Developer Intern
                </Text>
              }>
              <Text className="dark:text-gray-400">Encoders Inc.</Text>
              <List>
                <List.Item className="dark:text-gray-400 list-disc">Create website ui designs</List.Item>
                <List.Item className="dark:text-gray-400 list-disc">website development by implementing the UI design that has been made</List.Item>
                <List.Item className="dark:text-gray-400 list-disc">Deploy to the hosting server</List.Item>
              </List>
              <Text size="sm" color="dimmed" mt={4}>
                March 2023 - August 2023
              </Text>
            </Timeline.Item>
          </Timeline>
        </MotionPage>
      </Box>
      <Box mt="md" id="resume" mb="xl" className="mb-20">
        <MotionPage delay={1.5}>
          <Text size={42} weight="bold">
            Resume
          </Text>
          <Box>
            You can read my resume{' '}
            {/* <a href="https://drive.google.com/file/d/1XKykAViR0RqgxrNeVoDsWcVEg8z5l6Rg/view?usp=sharing" target="_blank" className="underline text-blue-400 cursor-pointer">
              here.
            </a> */}
          </Box>
        </MotionPage>
      </Box>
    </div>
  )
}
