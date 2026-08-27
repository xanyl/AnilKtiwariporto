import { Box, Group, Text, Title, Tooltip } from '@mantine/core';

import MotionPage from './MotionPage';
import { Link } from 'react-router-dom';
import { BiGitRepoForked } from 'react-icons/bi';
import { FiExternalLink } from 'react-icons/fi';

import { Project } from '../data/projects/project';

export default function ProjectCard({ data, delay }: { data: Project; delay: number }) {
  const index = delay / 0.2;
  return (
    <MotionPage type={index % 2 == 0 ? 'left' : 'right'} delay={delay}>
      <div key={data.name} className="shadow-lg rounded-xl p-7 bg-white dark:bg-[#1A1B1E]">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
          }}>
          <Title order={3}>{data.name}</Title>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}>
            {data.link.repo && (
              <Link to={data.link.repo} target="_blank">
                <Tooltip label="Repository" color="gray" withArrow position="bottom">
                  <Box>
                    <BiGitRepoForked size={20} className="text-gray-400 hover:text-black transition-all dark:hover:text-white" />
                  </Box>
                </Tooltip>
              </Link>
            )}
            {data.link.demo && (
              <Link to={data.link.demo} target="_blank">
                <Tooltip label="Demo" color="gray" withArrow position="bottom">
                  <Box>
                    <FiExternalLink size={21} className="text-gray-400 hover:text-black transition-all dark:hover:text-white" />
                  </Box>
                </Tooltip>
              </Link>
            )}
          </Box>
        </Box>
        <Text className="inline-flex min-h-[4rem] w-full items-center my-3 break-words">{data.desc}</Text>
        <Group spacing="xs">
          {data.tech.map((technology) => (
            <Text
              key={technology}
              size="xs"
              className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              {technology}
            </Text>
          ))}
        </Group>
      </div>
    </MotionPage>
  );
}
