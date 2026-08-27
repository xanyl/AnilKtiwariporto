import {
  Box,
  Center,
  Grid,
  List,
  SimpleGrid,
  Text,
  Timeline,
} from "@mantine/core";
import MotionPage from "../components/MotionPage";
import useTheme from "../globalState/theme";
import getImgUrl from "../../public/assets/getImgUrl";
import { ThemeState } from "../components/templates/NavBar";
import resumeUrl from "../../resume/Resume_Anil.pdf?url";
import { certificates } from "../data/certificates";

export default function About() {
  const theme = useTheme((state) => (state as ThemeState).theme);

  return (
    <div className="py-7 px-5 sm:px-0">
      <Grid>
        <Grid.Col xs={12} md={3} orderXs={1} orderMd={2}>
          <MotionPage type="bottom">
            <Center sx={{ paddingTop: "1.5rem" }}>
              <img
                src={getImgUrl("anil.JPG")}
                alt="Anil Kumar Tiwari"
                width={150}
                height={150}
                className="rounded-full shadow-lg dark:shadow-gray-700/50 mt-5"
              />
            </Center>
          </MotionPage>
        </Grid.Col>
        <Grid.Col xs={12} md={9} orderXs={2} orderMd={1}>
          <MotionPage>
            <Text size={42} weight="bold">
              About Me
            </Text>

            <Text
              component="span"
              variant="gradient"
              size={26}
              weight="bold"
              gradient={{
                from: "indigo",
                to: `${theme === "dark" ? "gray" : "black"}`,
                deg: 45,
              }}
            >
              Anil Kumar Tiwari
            </Text>
            <Text size="md" my="sm">
              I am a Data Engineer with more than two years of experience
              building scalable data architectures, production-grade machine
              learning solutions, and automated workflows.
            </Text>
            <Text size="md" my="sm">
              I am pursuing an M.S. in Computer Science at Georgia State
              University, where I also work as a Graduate Teaching Assistant.
              My interests include data engineering, AI/ML, LLM integration,
              and cloud-native systems.
            </Text>
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
                  M.S. in Computer Science
                </Text>
              }
            >
              <Text className="dark:text-gray-400">Georgia State University</Text>
              <Text
                size="sm"
                color="dimmed"
                mt={4}
                className="dark:text-gray-400"
              >
                Expected August 2027
              </Text>
            </Timeline.Item>
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  B.S. in Computer Engineering
                </Text>
              }
            >
              <Text className="dark:text-gray-400">Pokhara University</Text>
              <Text
                size="sm"
                color="dimmed"
                mt={4}
                className="dark:text-gray-400"
              >
                August 2023
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
                  Graduate Teaching Assistant
                </Text>
              }
            >
              <Text className="dark:text-gray-400">
                Georgia State University
              </Text>
              <List>
                <List.Item className="dark:text-gray-400 list-disc">
                  Support more than 50 students as a first point of contact,
                  providing academic guidance and resource referrals.
                </List.Item>
                <List.Item className="dark:text-gray-400 list-disc">
                  Collaborate with faculty to modernize curriculum using
                  real-world datasets and industry-standard tools.
                </List.Item>
              </List>
              <Text size="sm" color="dimmed" mt={4}>
                August 2025 - Present
              </Text>
            </Timeline.Item>
            <Timeline.Item
              title={
                <Text weight="bold" size="lg" className="dark:text-gray-400">
                  Data Engineer
                </Text>
              }
            >
              <Text className="dark:text-gray-400">Merodream</Text>
              <List>
                <List.Item className="dark:text-gray-400 list-disc">
                  Designed ETL scripts, CTEs, views, procedures, and Redshift
                  tasks orchestrated with Apache Airflow.
                </List.Item>
                <List.Item className="dark:text-gray-400 list-disc">
                  Built and monitored daily AWS Redshift pipelines while
                  resolving batch-processing issues.
                </List.Item>
                <List.Item className="dark:text-gray-400 list-disc">
                  Optimized SQL queries and table partitioning, reducing cloud
                  compute costs by 25% while processing terabytes of data.
                </List.Item>
                <List.Item className="dark:text-gray-400 list-disc">
                  Supported scalable ML training pipelines using Docker and
                  Kubernetes.
                </List.Item>
              </List>
              <Text size="sm" color="dimmed" mt={4}>
                September 2023 - August 2025
              </Text>
            </Timeline.Item>
          </Timeline>
        </MotionPage>
      </Box>
      <Box mt="xl">
        <MotionPage delay={1.5}>
          <Text size={42} weight="bold">
            Certificates
          </Text>
          <SimpleGrid
            cols={1}
            breakpoints={[{ minWidth: "sm", cols: 2 }]}
            spacing="md"
            mt="md"
          >
            {certificates.map((certificate) => (
              <Box
                key={certificate.credentialId}
                className="rounded-xl border border-gray-200 p-5 shadow-sm dark:border-gray-700"
              >
                <Text weight="bold" size="lg">
                  {certificate.title}
                </Text>
                <Text className="dark:text-gray-400">
                  {certificate.issuer}
                </Text>
                <Text size="sm" color="dimmed" mt={4}>
                  {certificate.issued} - Credential ID: {certificate.credentialId}
                </Text>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={certificate.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View PDF
                  </a>
                  {certificate.verificationUrl && (
                    <a
                      href={certificate.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-blue-500 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      Verify
                    </a>
                  )}
                </div>
              </Box>
            ))}
          </SimpleGrid>
        </MotionPage>
      </Box>
      <Box mt="md" id="resume" mb="xl" className="mb-20">
        <MotionPage delay={2}>
          <Text size={42} weight="bold">
            Resume
          </Text>
          <Box className="mt-3 flex flex-wrap gap-3">
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              View resume (PDF)
            </a>
            <a
              href={resumeUrl}
              download="Anil-Kumar-Tiwari-Resume.pdf"
              className="rounded-md border border-blue-500 px-4 py-2 font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              Download resume
            </a>
          </Box>
        </MotionPage>
      </Box>
    </div>
  );
}
