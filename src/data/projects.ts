// 项目数据配置文件
// 用于管理项目展示页面的数据

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	demoUrl?: string;
	sourceUrl?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
}

export const projectsData: Project[] = [
	// 在这里添加你的项目
	// 示例格式：
	// {
	// 	id: "my-project",
	// 	title: "项目名称",
	// 	description: "项目描述",
	// 	image: "",
	// 	category: "web",
	// 	techStack: ["技术1", "技术2"],
	// 	status: "completed",
	// 	liveDemo: "https://example.com",
	// 	sourceCode: "https://github.com/johntime2005/project",
	// 	startDate: "2024-01-01",
	// 	endDate: "2024-06-01",
	// 	featured: true,
	// 	tags: ["标签1", "标签2"],
	// },
];

export interface ProjectStats {
	total: number;
	byStatus: {
		completed: number;
		inProgress: number;
		planned: number;
	};
}

// 获取项目统计信息
export const getProjectStats = (): ProjectStats => {
	const total = projectsData.length;
	const completed = projectsData.filter((p) => p.status === "completed").length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total: total,
		byStatus: {
			completed: completed,
			inProgress: inProgress,
			planned: planned,
		},
	};
};

// 根据分类获取项目
export const getProjectsByCategory = (
	category?: Project["category"] | "all",
): Project[] => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// 获取精选项目
export const getFeaturedProjects = (): Project[] => {
	return projectsData.filter((p) => p.featured);
};

// 获取所有技术栈
export const getAllTechStack = (): string[] => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
